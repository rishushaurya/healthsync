'use client';

import { useRef, useState } from 'react';

type Recognition = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void; stop: () => void };

// One-shot dictation into a text field (Web Speech API; Chrome/Edge)
export function useSpeechInput(onText: (text: string) => void, lang = 'en-IN') {
    const [listening, setListening] = useState(false);
    const recRef = useRef<Recognition | null>(null);
    const w = typeof window !== 'undefined' ? (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }) : null;
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition;

    const toggle = () => {
        if (!SR) return;
        if (listening) { recRef.current?.stop(); return; }
        const rec = new SR();
        rec.lang = lang;
        rec.interimResults = false;
        rec.onresult = e => onText(e.results[0][0].transcript);
        rec.onend = () => setListening(false);
        recRef.current = rec;
        rec.start();
        setListening(true);
    };

    return { supported: !!SR, listening, toggle };
}
