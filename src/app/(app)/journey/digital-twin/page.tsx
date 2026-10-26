'use client';

import dynamic from 'next/dynamic';
import { Brain, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getActiveJourney, getCurrentUser, saveJourney, JourneyStep } from '@/lib/store';

const DigitalTwinContent = dynamic(() => import('@/app/(app)/journey/digital-twin/DigitalTwinContent'), {
    ssr: false,
    loading: () => (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={40} /></div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Loading Digital Twin...</div>
            <div style={{ width: 24, height: 24, border: '3px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'rotate-slow 1s linear infinite' }} />
        </div>
    ),
});

export default function JourneyDigitalTwinPage() {
    const router = useRouter();

    const handleContinue = () => {
        const user = getCurrentUser();
        if (user) {
            const journey = getActiveJourney(user.id);
            if (journey) {
                const updated = { ...journey, currentStep: JourneyStep.BOOKING, updatedAt: new Date().toISOString() };
                saveJourney(updated);
            }
        }
        // Workflow: Digital Twin → choose / book the recommended doctor
        router.push('/journey/booking');
    };

    return (
        <div style={{ position: 'relative', padding: 24, height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <DigitalTwinContent />
            
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
                <button onClick={handleContinue} className="btn-primary" style={{ padding: '14px 28px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-md)' }}>
                    Save & Continue <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}
