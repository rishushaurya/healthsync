// WebRTC hook for real-time audio AND video calls between doctor and patient
// Signaling is done via Upstash Redis (polling-based)

import { useRef, useCallback, useEffect, useState } from 'react';
import { cloudGet, cloudSet } from '@/lib/shared-store';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
};

interface SignalData {
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    iceCandidates_caller?: RTCIceCandidateInit[];
    iceCandidates_callee?: RTCIceCandidateInit[];
}

const signalKey = (callId: string) => `hs_webrtc_signal_${callId}`;

async function getSignal(callId: string): Promise<SignalData | null> {
    return cloudGet<SignalData>(signalKey(callId));
}

async function setSignal(callId: string, data: SignalData): Promise<void> {
    await cloudSet(signalKey(callId), data);
}

// Wait for ICE gathering to finish (or timeout after 4s)
function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const onDone = () => {
            if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', onDone);
                resolve();
            }
        };
        pc.addEventListener('icegatheringstatechange', onDone);
        setTimeout(resolve, 4000);
    });
}

export function useWebRTC() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);

    // Exposed state for UI to bind video/audio elements
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    // Auto-play remote audio through speaker (works for both audio and video calls)
    useEffect(() => {
        if (remoteStream) {
            if (!remoteAudioRef.current) {
                const audio = document.createElement('audio');
                audio.autoplay = true;
                audio.setAttribute('playsinline', '');
                audio.style.display = 'none';
                document.body.appendChild(audio);
                remoteAudioRef.current = audio;
            }
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {
                // Auto-play blocked — user interaction needed (should be fine since they clicked accept)
            });
        } else if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
            remoteAudioRef.current.remove();
            remoteAudioRef.current = null;
        }
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
    };

    const cleanup = useCallback(() => {
        cleanupInternal();
        setLocalStream(null);
        setRemoteStream(null);
        setIsConnected(false);
        setPermissionError(null);
    }, []);

    // Get media stream with requested permissions
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
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return stream;
        } catch (err: unknown) {
            const error = err as Error;
            if (error.name === 'NotAllowedError') {
                throw new Error('Please allow microphone' + (callType === 'video' ? ' and camera' : '') + ' access to make calls');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No ' + (callType === 'video' ? 'camera or ' : '') + 'microphone found on this device');
            }
            throw new Error('Could not access media devices: ' + error.message);
        }
    };

    // Setup the peer connection with track handlers
    const setupPeerConnection = (stream: MediaStream): RTCPeerConnection => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add all local tracks (audio + video if video call)
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle incoming remote tracks
        const remoteMediaStream = new MediaStream();
        pc.ontrack = (evt) => {
            evt.streams[0]?.getTracks().forEach(track => {
                remoteMediaStream.addTrack(track);
            });
            if (isMountedRef.current) {
                setRemoteStream(new MediaStream(remoteMediaStream.getTracks()));
            }
        };

        // Connection state change
        pc.onconnectionstatechange = () => {
            if (isMountedRef.current) {
                setIsConnected(pc.connectionState === 'connected');
            }
        };

        return pc;
    };

    // CALLER (Doctor): Create offer and wait for callee answer
    const startAsCallerAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio'): Promise<void> => {
        cleanup();
        setPermissionError(null);

        let stream: MediaStream;
        try {
            stream = await getMediaStream(callType);
        } catch (err: unknown) {
            const msg = (err as Error).message;
            setPermissionError(msg);
            throw err;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = setupPeerConnection(stream);

        // Collect ICE candidates
        const callerCandidates: RTCIceCandidateInit[] = [];
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                callerCandidates.push(evt.candidate.toJSON());
            }
        };

        // Create & set offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await waitForIceGathering(pc);

        // Store offer + ICE candidates in Redis
        await setSignal(callId, {
            offer: pc.localDescription!.toJSON(),
            iceCandidates_caller: callerCandidates,
        });

        // Poll Redis for answer from callee
        pollRef.current = setInterval(async () => {
            if (!isMountedRef.current || !pcRef.current) return;
            try {
                const signal = await getSignal(callId);
                if (signal?.answer && pcRef.current && pcRef.current.signalingState !== 'stable') {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer));
                    // Add callee ICE candidates
                    if (signal.iceCandidates_callee) {
                        for (const c of signal.iceCandidates_callee) {
                            try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
                        }
                    }
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                }
            } catch { /* polling error, will retry */ }
        }, 1500);
    }, [cleanup]);

    // CALLEE (Patient): Receive offer, create answer
    const startAsCalleeAsync = useCallback(async (callId: string, callType: 'audio' | 'video' = 'audio'): Promise<void> => {
        cleanup();
        setPermissionError(null);

        // Get the signaling data (offer from caller)
        const signal = await getSignal(callId);
        if (!signal?.offer) {
            console.error('No offer found for call', callId);
            return;
        }

        let stream: MediaStream;
        try {
            stream = await getMediaStream(callType);
        } catch (err: unknown) {
            const msg = (err as Error).message;
            setPermissionError(msg);
            throw err;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = setupPeerConnection(stream);

        // Collect ICE candidates
        const calleeCandidates: RTCIceCandidateInit[] = [];
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                calleeCandidates.push(evt.candidate.toJSON());
            }
        };

        // Set remote offer from caller
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));

        // Add caller's ICE candidates
        if (signal.iceCandidates_caller) {
            for (const c of signal.iceCandidates_caller) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
            }
        }

        // Create & set answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await waitForIceGathering(pc);

        // Store answer + callee ICE candidates in Redis
        await setSignal(callId, {
            ...signal,
            answer: pc.localDescription!.toJSON(),
            iceCandidates_callee: calleeCandidates,
        });
    }, [cleanup]);

    // Toggle microphone mute/unmute
    const toggleMute = useCallback((muted: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
        }
    }, []);

    // Toggle camera on/off
    const toggleCamera = useCallback((off: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !off; });
        }
    }, []);

    // Stop WebRTC completely
    const stopCall = useCallback(() => {
        cleanup();
    }, [cleanup]);

    return {
        // Actions
        startAsCallerAsync,
        startAsCalleeAsync,
        toggleMute,
        toggleCamera,
        stopCall,
        cleanup,
        // State for UI binding
        localStream,
        remoteStream,
        isConnected,
        permissionError,
    };
}
