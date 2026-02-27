// WebRTC hook for real-time audio AND video calls
// Uses TURN relay servers for cross-network connectivity
// Signaling via Upstash Redis (polling-based)

import { useRef, useCallback, useEffect, useState } from 'react';
import { cloudGet, cloudSet } from '@/lib/shared-store';

// STUN + TURN servers for reliable cross-network connectivity
// TURN relay is critical for mobile networks with symmetric NATs
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Free TURN relay servers (OpenRelay by Metered)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
    iceCandidatePoolSize: 10,
};

interface SignalData {
    offer?: { type: string; sdp: string };
    answer?: { type: string; sdp: string };
    callerCandidates?: Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }>;
    calleeCandidates?: Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }>;
}

const signalKey = (callId: string) => `hs_rtc_${callId}`;

async function getSignal(callId: string): Promise<SignalData | null> {
    try {
        return await cloudGet<SignalData>(signalKey(callId));
    } catch {
        return null;
    }
}

async function updateSignal(callId: string, updates: Partial<SignalData>): Promise<void> {
    const existing = await getSignal(callId) || {};
    await cloudSet(signalKey(callId), { ...existing, ...updates });
}

export function useWebRTC() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Auto-play remote audio through device speaker
    useEffect(() => {
        if (remoteStream && remoteStream.getAudioTracks().length > 0) {
            if (!remoteAudioRef.current) {
                const audio = document.createElement('audio');
                audio.autoplay = true;
                audio.setAttribute('playsinline', '');
                // Force speaker on mobile
                (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
                    .setSinkId?.('default').catch(() => { });
                audio.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
                document.body.appendChild(audio);
                remoteAudioRef.current = audio;
            }
            remoteAudioRef.current.srcObject = remoteStream;
            // Multiple play attempts for mobile compatibility
            const tryPlay = () => {
                remoteAudioRef.current?.play().catch(() => {
                    setTimeout(tryPlay, 500);
                });
            };
            tryPlay();
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
        return () => {
            isMountedRef.current = false;
            cleanupInternal();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanupInternal = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
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

    // Request media permissions
    const getMediaStream = async (callType: 'audio' | 'video'): Promise<MediaStream> => {
        const constraints: MediaStreamConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: callType === 'video' ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
            } : false,
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err: unknown) {
            const e = err as Error;
            if (e.name === 'NotAllowedError') {
                throw new Error('Please allow ' + (callType === 'video' ? 'camera and microphone' : 'microphone') + ' access');
            }
            if (e.name === 'NotFoundError') {
                throw new Error('No ' + (callType === 'video' ? 'camera/' : '') + 'microphone found');
            }
            throw new Error('Media error: ' + e.message);
        }
    };

    // Serialize SDP safely (avoids toJSON issues on some browsers)
    const serializeSDP = (desc: RTCSessionDescription): { type: string; sdp: string } => ({
        type: desc.type,
        sdp: desc.sdp || '',
    });

    // Serialize ICE candidate safely
    const serializeCandidate = (c: RTCIceCandidate) => ({
        candidate: c.candidate,
        sdpMid: c.sdpMid,
        sdpMLineIndex: c.sdpMLineIndex,
    });

    // ═══════════ CALLER (Doctor) ═══════════
    const startAsCallerAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio'): Promise<void> => {
        cleanup();
        setPermissionError(null);

        // 1. Get mic (+ camera for video)
        let stream: MediaStream;
        try {
            stream = await getMediaStream(callType);
        } catch (err: unknown) {
            setPermissionError((err as Error).message);
            throw err;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // 3. Add local tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 4. Handle remote tracks
        pc.ontrack = (evt) => {
            console.log('[WebRTC] Remote track received:', evt.track.kind);
            if (isMountedRef.current) {
                const rs = evt.streams[0] || new MediaStream([evt.track]);
                setRemoteStream(rs);
            }
        };

        // 5. Connection state
        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            if (isMountedRef.current) {
                setIsConnected(pc.connectionState === 'connected');
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        };

        // 6. Collect ICE candidates
        const candidates: Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }> = [];
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                candidates.push(serializeCandidate(evt.candidate));
                console.log('[WebRTC] Caller ICE candidate:', evt.candidate.type);
            }
        };

        // 7. Create offer with explicit audio (and video if needed)
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);

        // 8. Wait for ICE gathering (wait longer for TURN)
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') { resolve(); return; }
            const onDone = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', onDone);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', onDone);
            setTimeout(resolve, 5000); // Longer timeout for TURN resolution
        });

        // 9. Store offer in Redis
        const finalOffer = pc.localDescription!;
        await updateSignal(callId, {
            offer: serializeSDP(finalOffer),
            callerCandidates: candidates,
        });
        console.log('[WebRTC] Offer stored, ICE candidates:', candidates.length);

        // 10. Poll for answer
        pollRef.current = setInterval(async () => {
            if (!isMountedRef.current || !pcRef.current) return;
            try {
                const signal = await getSignal(callId);
                if (signal?.answer && pcRef.current.signalingState === 'have-local-offer') {
                    console.log('[WebRTC] Answer received from callee');
                    const answerDesc = new RTCSessionDescription({
                        type: signal.answer.type as RTCSdpType,
                        sdp: signal.answer.sdp,
                    });
                    await pcRef.current.setRemoteDescription(answerDesc);

                    // Add callee's ICE candidates
                    if (signal.calleeCandidates) {
                        for (const c of signal.calleeCandidates) {
                            try {
                                await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
                            } catch { /* some candidates may fail, that's ok */ }
                        }
                        console.log('[WebRTC] Added', signal.calleeCandidates.length, 'callee candidates');
                    }

                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                }
            } catch (e) {
                console.error('[WebRTC] Poll error:', e);
            }
        }, 1500);
    }, [cleanup]);

    // ═══════════ CALLEE (Patient) ═══════════
    const startAsCalleeAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio'): Promise<void> => {
        cleanup();
        setPermissionError(null);

        // 1. Get offer from Redis (retry a few times)
        let signal: SignalData | null = null;
        for (let i = 0; i < 5; i++) {
            signal = await getSignal(callId);
            if (signal?.offer) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!signal?.offer) {
            console.error('[WebRTC] No offer found after retries');
            setPermissionError('Could not find call signal. Please try again.');
            return;
        }
        console.log('[WebRTC] Got offer from caller');

        // 2. Get mic (+ camera for video)
        let stream: MediaStream;
        try {
            stream = await getMediaStream(callType);
        } catch (err: unknown) {
            setPermissionError((err as Error).message);
            throw err;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 3. Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // 4. Add local tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 5. Handle remote tracks
        pc.ontrack = (evt) => {
            console.log('[WebRTC] Remote track received:', evt.track.kind);
            if (isMountedRef.current) {
                const rs = evt.streams[0] || new MediaStream([evt.track]);
                setRemoteStream(rs);
            }
        };

        // 6. Connection state
        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            if (isMountedRef.current) {
                setIsConnected(pc.connectionState === 'connected');
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        };

        // 7. Collect ICE candidates
        const candidates: Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }> = [];
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                candidates.push(serializeCandidate(evt.candidate));
                console.log('[WebRTC] Callee ICE candidate:', evt.candidate.type);
            }
        };

        // 8. Set remote offer
        const offerDesc = new RTCSessionDescription({
            type: signal.offer.type as RTCSdpType,
            sdp: signal.offer.sdp,
        });
        await pc.setRemoteDescription(offerDesc);

        // 9. Add caller's ICE candidates
        if (signal.callerCandidates) {
            for (const c of signal.callerCandidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch { /* ok */ }
            }
            console.log('[WebRTC] Added', signal.callerCandidates.length, 'caller candidates');
        }

        // 10. Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // 11. Wait for ICE gathering
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') { resolve(); return; }
            const onDone = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', onDone);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', onDone);
            setTimeout(resolve, 5000);
        });

        // 12. Store answer in Redis
        const finalAnswer = pc.localDescription!;
        await updateSignal(callId, {
            answer: serializeSDP(finalAnswer),
            calleeCandidates: candidates,
        });
        console.log('[WebRTC] Answer stored, ICE candidates:', candidates.length);
    }, [cleanup]);

    // ═══════════ Controls ═══════════
    const toggleMute = useCallback((muted: boolean) => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }, []);

    const toggleCamera = useCallback((off: boolean) => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
    }, []);

    const stopCall = useCallback(() => {
        cleanup();
    }, [cleanup]);

    return {
        startAsCallerAsync,
        startAsCalleeAsync,
        toggleMute,
        toggleCamera,
        stopCall,
        cleanup,
        localStream,
        remoteStream,
        isConnected,
        permissionError,
    };
}
