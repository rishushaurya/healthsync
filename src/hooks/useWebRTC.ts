// WebRTC hook — race-free signaling with separate Redis keys
// TURN credentials fetched from /api/turn
// Each signal type has its own key to prevent read-modify-write races

import { useRef, useCallback, useEffect, useState } from 'react';
import { cloudGet, cloudSet } from '@/lib/shared-store';

// ── ICE Config ──────────────────────────────────────────────

const FALLBACK: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
};

let cached: RTCConfiguration | null = null;
async function getIceConfig(): Promise<RTCConfiguration> {
    if (cached) return cached;
    try {
        const r = await fetch('/api/turn');
        if (r.ok) {
            const d = await r.json();
            cached = { iceServers: d.iceServers, iceCandidatePoolSize: 10 };
            return cached;
        }
    } catch { /* fallback */ }
    return FALLBACK;
}
// Pre-fetch on load
if (typeof window !== 'undefined') getIceConfig();

// ── Signaling — separate keys, no race conditions ───────────

type IceEntry = { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null };
type SdpEntry = { type: string; sdp: string };

// Each signal component gets its own Redis key
const KEY = {
    offer: (id: string) => `rtc_offer_${id}`,
    answer: (id: string) => `rtc_answer_${id}`,
    callerIce: (id: string) => `rtc_cice_${id}`,
    calleeIce: (id: string) => `rtc_eice_${id}`,
};

async function sigSet(key: string, val: unknown) {
    await cloudSet(key, val);
}
async function sigGet<T>(key: string): Promise<T | null> {
    try { return await cloudGet<T>(key); } catch { return null; }
}

// ── Media helper ────────────────────────────────────────────

async function getMedia(type: 'audio' | 'video'): Promise<MediaStream> {
    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: type === 'video'
                ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
                : false,
        });
    } catch (err: unknown) {
        const e = err as Error;
        if (e.name === 'NotAllowedError')
            throw new Error('Please allow ' + (type === 'video' ? 'camera and microphone' : 'microphone') + ' access in your browser settings');
        if (e.name === 'NotFoundError')
            throw new Error('No ' + (type === 'video' ? 'camera/' : '') + 'microphone found on this device');
        throw new Error('Could not access media: ' + e.message);
    }
}

// ── Hook ────────────────────────────────────────────────────

export function useWebRTC() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const icePushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // ── Auto-play remote audio ──
    useEffect(() => {
        if (!remoteStream || remoteStream.getAudioTracks().length === 0) return;
        if (!audioRef.current) {
            const a = document.createElement('audio');
            a.autoplay = true;
            a.setAttribute('playsinline', '');
            a.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            document.body.appendChild(a);
            audioRef.current = a;
            // Try to force speaker
            (a as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
                .setSinkId?.('default').catch(() => { });
        }
        audioRef.current.srcObject = remoteStream;
        audioRef.current.play().catch(() => {
            setTimeout(() => audioRef.current?.play().catch(() => { }), 500);
        });
    }, [remoteStream]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; cleanupAll(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanupAll = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (icePushTimer.current) { clearTimeout(icePushTimer.current); icePushTimer.current = null; }
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        pcRef.current?.close();
        pcRef.current = null;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.srcObject = null;
            audioRef.current.remove();
            audioRef.current = null;
        }
    };

    const cleanup = useCallback(() => {
        cleanupAll();
        setLocalStream(null);
        setRemoteStream(null);
        setIsConnected(false);
        setPermissionError(null);
    }, []);

    // ── Shared peer-connection setup ──
    const setupPC = (config: RTCConfiguration, stream: MediaStream) => {
        const pc = new RTCPeerConnection(config);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
            if (mountedRef.current) {
                const rs = e.streams[0] || new MediaStream([e.track]);
                setRemoteStream(rs);
            }
        };
        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            if (mountedRef.current) setIsConnected(s === 'connected');
            if (s === 'failed') {
                console.warn('[WebRTC] Connection FAILED — restarting ICE');
                pc.restartIce();
            }
        };
        pc.oniceconnectionstatechange = () => {
            const s = pc.iceConnectionState;
            if (s === 'connected' || s === 'completed') {
                if (mountedRef.current) setIsConnected(true);
            }
        };
        return pc;
    };

    // ── ICE candidate batching ──
    const createIcePusher = (callId: string, key: string) => {
        const buf: IceEntry[] = [];
        let scheduled = false;
        const flush = async () => {
            if (buf.length > 0 && mountedRef.current) {
                // Append to existing (read + append + write)
                const existing = (await sigGet<IceEntry[]>(key)) || [];
                await sigSet(key, [...existing, ...buf.splice(0)]);
            }
            scheduled = false;
        };
        return {
            push: (c: RTCIceCandidate) => {
                buf.push({ candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex });
                if (!scheduled) {
                    scheduled = true;
                    icePushTimer.current = setTimeout(flush, 300);
                }
            },
            flush,
        };
    };

    // ═══════════ CALLER (Doctor) ═══════════
    const startAsCallerAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio') => {
        cleanup();
        setPermissionError(null);

        // Parallel: get media + TURN config
        const [stream, config] = await Promise.all([
            getMedia(callType).catch((e: Error) => { setPermissionError(e.message); throw e; }),
            getIceConfig(),
        ]);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = setupPC(config, stream);

        // ICE candidate batching → separate key
        const icePusher = createIcePusher(callId, KEY.callerIce(callId));
        pc.onicecandidate = (e) => { if (e.candidate) icePusher.push(e.candidate); };

        // Create and send offer immediately
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);
        await sigSet(KEY.offer(callId), { type: offer.type, sdp: offer.sdp || '' });

        // Poll for answer + callee ICE on separate keys (fast: 500ms)
        let answerApplied = false;
        let lastIceCount = 0;
        pollRef.current = setInterval(async () => {
            if (!mountedRef.current || !pcRef.current) {
                if (pollRef.current) clearInterval(pollRef.current);
                return;
            }
            const p = pcRef.current;

            // Check for answer
            if (!answerApplied) {
                const ans = await sigGet<SdpEntry>(KEY.answer(callId));
                if (ans && p.signalingState === 'have-local-offer') {
                    try {
                        await p.setRemoteDescription(new RTCSessionDescription({ type: ans.type as RTCSdpType, sdp: ans.sdp }));
                        answerApplied = true;
                        // Flush our remaining candidates
                        icePusher.flush();
                    } catch (e) {
                        console.error('[WebRTC] Failed to set answer:', e);
                    }
                }
            }

            // Check for callee ICE candidates 
            const ice = await sigGet<IceEntry[]>(KEY.calleeIce(callId));
            if (ice && ice.length > lastIceCount) {
                const newOnes = ice.slice(lastIceCount);
                lastIceCount = ice.length;
                for (const c of newOnes) {
                    try { await p.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
                }
            }

            // Stop polling after connected + all candidates received
            if (answerApplied && p.iceConnectionState === 'connected') {
                // Keep polling a bit for late candidates, then stop
                setTimeout(() => {
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                }, 5000);
            }
        }, 500);

    }, [cleanup]);

    // ═══════════ CALLEE (Patient) ═══════════
    const startAsCalleeAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio') => {
        cleanup();
        setPermissionError(null);

        // Parallel: fetch offer + get media + TURN config
        const [offerData, stream, config] = await Promise.all([
            // Retry fetching offer up to 6 times (3 seconds)
            (async () => {
                for (let i = 0; i < 6; i++) {
                    const o = await sigGet<SdpEntry>(KEY.offer(callId));
                    if (o) return o;
                    await new Promise(r => setTimeout(r, 500));
                }
                return null;
            })(),
            getMedia(callType).catch((e: Error) => { setPermissionError(e.message); throw e; }),
            getIceConfig(),
        ]);

        if (!offerData) {
            setPermissionError('Could not find call signal. Please try again.');
            stream.getTracks().forEach(t => t.stop());
            return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = setupPC(config, stream);

        // ICE candidate batching → separate key
        const icePusher = createIcePusher(callId, KEY.calleeIce(callId));
        pc.onicecandidate = (e) => { if (e.candidate) icePusher.push(e.candidate); };

        // Set remote offer
        await pc.setRemoteDescription(new RTCSessionDescription({
            type: offerData.type as RTCSdpType,
            sdp: offerData.sdp,
        }));

        // Add any caller ICE candidates already available
        const callerIce = await sigGet<IceEntry[]>(KEY.callerIce(callId));
        let lastCallerIceCount = callerIce?.length || 0;
        if (callerIce) {
            for (const c of callerIce) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
            }
        }

        // Create and send answer immediately
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sigSet(KEY.answer(callId), { type: answer.type, sdp: answer.sdp || '' });

        // Flush ICE candidates after short delay
        setTimeout(() => icePusher.flush(), 500);

        // Poll for new caller ICE candidates (500ms, up to 15 seconds)
        let pollCount = 0;
        pollRef.current = setInterval(async () => {
            pollCount++;
            if (!mountedRef.current || !pcRef.current || pollCount > 30) {
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                return;
            }
            const ice = await sigGet<IceEntry[]>(KEY.callerIce(callId));
            if (ice && ice.length > lastCallerIceCount) {
                const newOnes = ice.slice(lastCallerIceCount);
                lastCallerIceCount = ice.length;
                for (const c of newOnes) {
                    try { await pcRef.current!.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
                }
            }
        }, 500);

    }, [cleanup]);

    // ── Controls ──
    const toggleMute = useCallback((muted: boolean) => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }, []);

    const toggleCamera = useCallback((off: boolean) => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
    }, []);

    const stopCall = useCallback(() => cleanup(), [cleanup]);

    return {
        startAsCallerAsync, startAsCalleeAsync,
        toggleMute, toggleCamera, stopCall, cleanup,
        localStream, remoteStream, isConnected, permissionError,
    };
}
