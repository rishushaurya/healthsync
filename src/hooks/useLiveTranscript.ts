'use client';

import { useEffect, useState } from 'react';
import { cloudAppendTranscript } from '@/lib/shared-store';

type Recognition = {
    continuous: boolean; interimResults: boolean; lang: string;
    onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
    onend: () => void; onerror: (e: { error: string }) => void;
    start: () => void; stop: () => void;
};

const getRecognition = (): (new () => Recognition) | null => {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

// Consented live transcription: this device's microphone → the journey's shared transcript.
// Runs only while `active` (both sides consented and the consult is live). Web Speech API: Chrome/Edge.
export function useLiveTranscript(journeyId: string | null, speaker: 'doctor' | 'patient', active: boolean, lang = 'en-IN') {
    const [listening, setListening] = useState(false);
    const supported = getRecognition() !== null;

    useEffect(() => {
        const SR = getRecognition();
        if (!active || !journeyId || !SR) return;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = lang;
        let stopped = false;

        rec.onresult = (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const text = e.results[i][0].transcript.trim();
                if (e.results[i].isFinal && text) cloudAppendTranscript(journeyId, { speaker, text, at: new Date().toISOString() });
            }
        };
        // Chrome stops after a pause in speech; keep restarting until the consult ends
        rec.onend = () => {
            if (stopped) return setListening(false);
            try { rec.start(); } catch { /* already started */ }
        };
        rec.onerror = (e) => {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopped = true; setListening(false); }
        };

        try { rec.start(); setListening(true); } catch { /* mic busy */ }
        return () => { stopped = true; rec.stop(); setListening(false); };
    }, [active, journeyId, speaker, lang]);

    return { supported, listening };
}
