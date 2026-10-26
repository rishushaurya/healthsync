'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/store';
import { Check } from 'lucide-react';

// Order follows the HealthSync workflow: history → MediKiosk or Digital Twin → doctor → reports → consult → approved plan
const STEPS = [
    { label: 'History', paths: ['/journey/intake'] },
    { label: 'Assessment', paths: ['/journey/medikiosk', '/journey/digital-twin'] },
    { label: 'Doctor', paths: ['/journey/booking'] },
    { label: 'Reports', paths: ['/journey/reports'] },
    { label: 'Consultation', paths: ['/journey/consultation'] },
    { label: 'Care plan', paths: ['/journey/care-plan'] },
];

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!getCurrentUser()) router.push('/auth');
    }, [router]);

    if (!mounted) return null;

    const current = STEPS.findIndex(s => s.paths.some(p => pathname.startsWith(p)));
    if (current < 0) return <>{children}</>; // patient home has no stepper

    return (
        <div>
            <style>{`
                .stepper { display: flex; gap: 6px; list-style: none; }
                .stepper li { flex: 1; min-width: 0; }
                .stepper .bar { height: 4px; border-radius: 999px; background: var(--border-color); }
                .stepper .done .bar, .stepper .now .bar { background: var(--color-primary); }
                .stepper .lbl { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; font-weight: 600; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .stepper .now .lbl { color: var(--color-primary); }
                .stepper .done .lbl { color: var(--text-secondary); }
                .stepper-mobile { display: none; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
                @media (max-width: 700px) { .stepper .lbl { display: none; } .stepper-mobile { display: block; } }
            `}</style>
            <nav aria-label="Care journey progress" style={{ marginBottom: 24 }}>
                <div className="stepper-mobile">Step {current + 1} of {STEPS.length} · {STEPS[current].label}</div>
                <ol className="stepper">
                    {STEPS.map((step, i) => {
                        const state = i < current ? 'done' : i === current ? 'now' : 'todo';
                        const label = (
                            <span className="lbl">
                                {state === 'done' && <Check size={14} />}{i + 1}. {step.label}
                            </span>
                        );
                        return (
                            <li key={step.label} className={state} aria-current={state === 'now' ? 'step' : undefined}>
                                <div className="bar" />
                                {state === 'done' ? <Link href={step.paths[0]} style={{ textDecoration: 'none' }}>{label}</Link> : label}
                            </li>
                        );
                    })}
                </ol>
            </nav>
            {children}
        </div>
    );
}
