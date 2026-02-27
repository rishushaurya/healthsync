// WebRTC hook for real-time voice calls between doctor and patient
// Signaling is done via Upstash Redis (polling-based)

import { useRef, useCallback, useEffect } from 'react';
import { cloudGet, cloudSet } from '@/lib/shared-store';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
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

export function useWebRTC() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanup = useCallback(() => {
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
            remoteAudioRef.current.srcObject = null;
        }
    }, []);

    const getAudioStream = async (): Promise<MediaStream> => {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    };

    // Create audio element for remote stream
    const ensureRemoteAudio = () => {
        if (!remoteAudioRef.current) {
            const audio = document.createElement('audio');
            audio.autoplay = true;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            remoteAudioRef.current = audio;
        }
        return remoteAudioRef.current;
    };

    // CALLER (Doctor): Create offer and start waiting for answer
    const startAsCallerAsync = useCallback(async (callId: string): Promise<void> => {
        cleanup();

        const stream = await getAudioStream();
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local audio tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle remote audio
        const audio = ensureRemoteAudio();
        pc.ontrack = (evt) => {
            audio.srcObject = evt.streams[0] || new MediaStream([evt.track]);
        };

        // Collect ICE candidates
        const callerCandidates: RTCIceCandidateInit[] = [];
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                callerCandidates.push(evt.candidate.toJSON());
            }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete (or timeout)
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') { resolve(); return; }
            const check = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', check);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(resolve, 3000); // Don't wait forever
        });

        // Store offer + ICE candidates in Redis
        await setSignal(callId, {
            offer: pc.localDescription!.toJSON(),
            iceCandidates_caller: callerCandidates,
        });

        // Poll for answer from callee
        pollRef.current = setInterval(async () => {
            if (!isMountedRef.current || !pcRef.current) return;
            const signal = await getSignal(callId);
            if (signal?.answer && pcRef.current.signalingState !== 'stable') {
                try {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer));
                    // Add callee ICE candidates
                    if (signal.iceCandidates_callee) {
                        for (const c of signal.iceCandidates_callee) {
                            try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
                        }
                    }
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                } catch (e) {
                    console.error('Error setting remote description:', e);
                }
            }
        }, 1000);
    }, [cleanup]);

    // CALLEE (Patient): Receive offer, create answer
    const startAsCalleeAsync = useCallback(async (callId: string): Promise<void> => {
        cleanup();

        const signal = await getSignal(callId);
        if (!signal?.offer) {
            console.error('No offer found for call', callId);
            return;
        }

        const stream = await getAudioStream();
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const audio = ensureRemoteAudio();
        pc.ontrack = (evt) => {
            audio.srcObject = evt.streams[0] || new MediaStream([evt.track]);
        };

        // Collect ICE candidates
        const calleeCandidates: RTCIceCandidateInit[] = [];
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                calleeCandidates.push(evt.candidate.toJSON());
            }
        };

        // Set remote offer
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));

        // Add caller's ICE candidates
        if (signal.iceCandidates_caller) {
            for (const c of signal.iceCandidates_caller) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
            }
        }

        // Create and set answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Wait for ICE gathering
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') { resolve(); return; }
            const check = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', check);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(resolve, 3000);
        });

        // Store answer + callee ICE candidates
        await setSignal(callId, {
            ...signal,
            answer: pc.localDescription!.toJSON(),
            iceCandidates_callee: calleeCandidates,
        });
    }, [cleanup]);

    // Mute/unmute local audio
    const toggleMute = useCallback((muted: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
        }
    }, []);

    // Stop WebRTC completely
    const stopCall = useCallback(() => {
        cleanup();
    }, [cleanup]);

    return {
        startAsCallerAsync,
        startAsCalleeAsync,
        toggleMute,
        stopCall,
        cleanup,
    };
}
