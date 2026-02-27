// WebRTC hook — FAST trickle ICE (no waiting for gathering)
// TURN credentials fetched from /api/turn
// Signaling via Upstash Redis

import { useRef, useCallback, useEffect, useState } from 'react';
import { cloudGet, cloudSet } from '@/lib/shared-store';

// Fallback STUN-only
const FALLBACK_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

// Cached TURN config (fetched once, reused for the session)
let cachedConfig: RTCConfiguration | null = null;
async function getIceConfig(): Promise<RTCConfiguration> {
    if (cachedConfig) return cachedConfig;
    try {
        const res = await fetch('/api/turn');
        if (res.ok) {
            const data = await res.json();
            cachedConfig = { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
            return cachedConfig;
        }
    } catch { /* fall through */ }
    return FALLBACK_CONFIG;
}

// Pre-fetch TURN config on module load (so it's ready when user clicks call)
if (typeof window !== 'undefined') { getIceConfig(); }

interface SignalData {
    offer?: { type: string; sdp: string };
    answer?: { type: string; sdp: string };
    callerIce?: Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }>;
    calleeIce?: Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }>;
}

type IceEntry = { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null };

const sigKey = (id: string) => `hs_rtc_${id}`;

async function getSig(id: string): Promise<SignalData | null> {
    try { return await cloudGet<SignalData>(sigKey(id)); } catch { return null; }
}

async function setSig(id: string, data: SignalData): Promise<void> {
    await cloudSet(sigKey(id), data);
}

// Merge-update: read existing, merge new fields, write back
async function mergeSig(id: string, updates: Partial<SignalData>): Promise<void> {
    const existing = await getSig(id) || {};
    await cloudSet(sigKey(id), { ...existing, ...updates });
}

export function useWebRTC() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const candidatePushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Auto-play remote audio through speaker
    useEffect(() => {
        if (remoteStream && remoteStream.getAudioTracks().length > 0) {
            if (!remoteAudioRef.current) {
                const audio = document.createElement('audio');
                audio.autoplay = true;
                audio.setAttribute('playsinline', '');
                (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
                    .setSinkId?.('default').catch(() => { });
                audio.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
                document.body.appendChild(audio);
                remoteAudioRef.current = audio;
            }
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {
                setTimeout(() => remoteAudioRef.current?.play().catch(() => { }), 300);
            });
        }
        return () => {
            if (!remoteStream && remoteAudioRef.current) {
                remoteAudioRef.current.pause();
                remoteAudioRef.current.srcObject = null;
                remoteAudioRef.current.remove();
                remoteAudioRef.current = null;
            }
        };
    }, [remoteStream]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; cleanupInternal(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanupInternal = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (candidatePushRef.current) { clearTimeout(candidatePushRef.current); candidatePushRef.current = null; }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.pause();
            remoteAudioRef.current.srcObject = null;
            remoteAudioRef.current.remove();
            remoteAudioRef.current = null;
        }
    };

    const cleanup = useCallback(() => {
        cleanupInternal();
        setLocalStream(null);
        setRemoteStream(null);
        setIsConnected(false);
        setPermissionError(null);
    }, []);

    const getMedia = async (type: 'audio' | 'video'): Promise<MediaStream> => {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
            });
        } catch (err: unknown) {
            const e = err as Error;
            if (e.name === 'NotAllowedError') throw new Error('Please allow ' + (type === 'video' ? 'camera and microphone' : 'microphone') + ' access');
            if (e.name === 'NotFoundError') throw new Error('No ' + (type === 'video' ? 'camera/' : '') + 'microphone found');
            throw new Error('Media error: ' + e.message);
        }
    };

    const serializeSDP = (d: RTCSessionDescription) => ({ type: d.type, sdp: d.sdp || '' });
    const serializeIce = (c: RTCIceCandidate): IceEntry => ({ candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex });

    // ═══════════ CALLER (Doctor) — Trickle ICE ═══════════
    const startAsCallerAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio'): Promise<void> => {
        cleanup();
        setPermissionError(null);

        // 1. Get media + TURN config in PARALLEL (saves ~1-2s)
        const [stream, iceConfig] = await Promise.all([
            getMedia(callType).catch((err: Error) => { setPermissionError(err.message); throw err; }),
            getIceConfig(),
        ]);
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Create peer connection
        const pc = new RTCPeerConnection(iceConfig);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        // 3. Handle remote tracks
        pc.ontrack = (e) => {
            if (isMountedRef.current) setRemoteStream(e.streams[0] || new MediaStream([e.track]));
        };
        pc.onconnectionstatechange = () => {
            if (isMountedRef.current) setIsConnected(pc.connectionState === 'connected');
        };

        // 4. Trickle ICE: collect candidates and push to Redis periodically
        const candidates: IceEntry[] = [];
        let pushScheduled = false;
        const pushCandidates = async () => {
            if (candidates.length > 0 && isMountedRef.current) {
                await mergeSig(callId, { callerIce: [...candidates] }).catch(() => { });
            }
            pushScheduled = false;
        };
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                candidates.push(serializeIce(e.candidate));
                // Batch push every 500ms to avoid hammering Redis
                if (!pushScheduled) {
                    pushScheduled = true;
                    candidatePushRef.current = setTimeout(pushCandidates, 500);
                }
            }
        };

        // 5. Create offer and send IMMEDIATELY (no waiting for ICE!)
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);

        // Store offer RIGHT AWAY — don't wait for candidates
        await setSig(callId, { offer: serializeSDP(pc.localDescription!) });

        // 6. Poll for answer (fast: every 800ms)
        pollRef.current = setInterval(async () => {
            if (!isMountedRef.current || !pcRef.current) return;
            try {
                const sig = await getSig(callId);
                if (!sig?.answer) return;
                const p = pcRef.current;
                if (p.signalingState === 'have-local-offer') {
                    await p.setRemoteDescription(new RTCSessionDescription({ type: sig.answer.type as RTCSdpType, sdp: sig.answer.sdp }));
                    // Add callee ICE candidates
                    if (sig.calleeIce) {
                        for (const c of sig.calleeIce) {
                            try { await p.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
                        }
                    }
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                    // Push any remaining caller candidates
                    pushCandidates();
                } else if (p.signalingState === 'stable' && sig.calleeIce) {
                    // Already connected but new callee candidates arrived
                    for (const c of sig.calleeIce) {
                        try { await p.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
                    }
                }
            } catch { /* retry */ }
        }, 800);
    }, [cleanup]);

    // ═══════════ CALLEE (Patient) — Trickle ICE ═══════════
    const startAsCalleeAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio'): Promise<void> => {
        cleanup();
        setPermissionError(null);

        // 1. Fetch offer + get media + TURN config ALL in parallel
        const [sig, stream, iceConfig] = await Promise.all([
            (async () => {
                for (let i = 0; i < 3; i++) {
                    const s = await getSig(callId);
                    if (s?.offer) return s;
                    await new Promise(r => setTimeout(r, 500));
                }
                return await getSig(callId);
            })(),
            getMedia(callType).catch((err: Error) => { setPermissionError(err.message); throw err; }),
            getIceConfig(),
        ]);

        if (!sig?.offer) {
            setPermissionError('Call signal not found. Try again.');
            return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Create peer connection
        const pc = new RTCPeerConnection(iceConfig);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        // 3. Handle remote tracks
        pc.ontrack = (e) => {
            if (isMountedRef.current) setRemoteStream(e.streams[0] || new MediaStream([e.track]));
        };
        pc.onconnectionstatechange = () => {
            if (isMountedRef.current) setIsConnected(pc.connectionState === 'connected');
        };

        // 4. Trickle ICE for callee
        const candidates: IceEntry[] = [];
        let pushScheduled = false;
        const pushCandidates = async () => {
            if (candidates.length > 0 && isMountedRef.current) {
                await mergeSig(callId, { calleeIce: [...candidates] }).catch(() => { });
            }
            pushScheduled = false;
        };
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                candidates.push(serializeIce(e.candidate));
                if (!pushScheduled) {
                    pushScheduled = true;
                    candidatePushRef.current = setTimeout(pushCandidates, 500);
                }
            }
        };

        // 5. Set remote offer
        await pc.setRemoteDescription(new RTCSessionDescription({ type: sig.offer.type as RTCSdpType, sdp: sig.offer.sdp }));

        // Add any caller ICE candidates that arrived
        if (sig.callerIce) {
            for (const c of sig.callerIce) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
            }
        }

        // 6. Create answer and send IMMEDIATELY
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Store answer RIGHT AWAY
        await mergeSig(callId, { answer: serializeSDP(pc.localDescription!) });

        // Push remaining candidates after a short delay
        setTimeout(pushCandidates, 1000);

        // 7. Poll for new caller ICE candidates (fast: every 1s, stop after 10s)
        let pollCount = 0;
        pollRef.current = setInterval(async () => {
            pollCount++;
            if (!isMountedRef.current || !pcRef.current || pollCount > 10) {
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                return;
            }
            try {
                const updated = await getSig(callId);
                if (updated?.callerIce && updated.callerIce.length > (sig.callerIce?.length || 0)) {
                    const newOnes = updated.callerIce.slice(sig.callerIce?.length || 0);
                    for (const c of newOnes) {
                        try { await pcRef.current!.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ok */ }
                    }
                }
            } catch { /* retry */ }
        }, 1000);
    }, [cleanup]);

    // ═══════════ Controls ═══════════
    const toggleMute = useCallback((muted: boolean) => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }, []);

    const toggleCamera = useCallback((off: boolean) => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
    }, []);

    const stopCall = useCallback(() => { cleanup(); }, [cleanup]);

    return {
        startAsCallerAsync, startAsCalleeAsync,
        toggleMute, toggleCamera, stopCall, cleanup,
        localStream, remoteStream, isConnected, permissionError,
    };
}
