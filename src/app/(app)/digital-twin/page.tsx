'use client';

import dynamic from 'next/dynamic';
import { Brain } from 'lucide-react';

const DigitalTwinContent = dynamic(() => import('./DigitalTwinContent'), {
    ssr: false,
    loading: () => (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={40} /></div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Loading Digital Twin...</div>
            <div style={{ width: 24, height: 24, border: '3px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'rotate-slow 1s linear infinite' }} />
        </div>
    ),
});

export default function DigitalTwinPage() {
    return <DigitalTwinContent />;
}
