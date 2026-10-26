'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Hourglass, Pill, Salad, Dumbbell, CalendarCheck, ShoppingCart, ArrowRight, Info } from 'lucide-react';
import {
    getActiveJourney, getLatestApprovedJourney, getCurrentUser, getCarePlan, getAppointments, journeyPath,
    type PatientJourney, type CarePlanDraft,
} from '@/lib/store';

export default function CarePlanStatusPage() {
    const router = useRouter();
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [plan, setPlan] = useState<CarePlanDraft | null>(null);

    useEffect(() => {
        const load = () => {
            const user = getCurrentUser();
            if (!user) { router.push('/auth'); return; }
            const j = getActiveJourney(user.id) || getLatestApprovedJourney(user.id);
            if (!j) { router.push('/journey/patient-portal'); return; }
            if (!j.draftCarePlanId) { router.push(journeyPath(j.currentStep)); return; }
            setJourney(j);
            setPlan(getCarePlan(j));
        };
        load();
        const id = setInterval(load, 3000); // flips to the plan as soon as the doctor's approval syncs
        return () => clearInterval(id);
    }, [router]);

    if (!journey || !plan) return null;
    const doctorName = getAppointments().find(a => a.id === journey.appointmentId)?.doctorName || 'Your doctor';

    if (plan.status !== 'approved') {
        return (
            <div className="card" role="status" style={{ maxWidth: 600, margin: '20px auto', padding: 32, textAlign: 'center' }}>
                <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--warning-soft)', color: 'var(--color-warning)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                    <Hourglass size={30} />
                </span>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>{doctorName} is reviewing your care plan</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '10px auto 0', maxWidth: 440 }}>
                    A draft was prepared from your consultation. Your doctor checks every medicine, dose and instruction before it’s released to you. This page updates on its own.
                </p>
                <div className="spinner" style={{ margin: '22px auto 0' }} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <h1 className="page-title">Your care plan</h1>
                <span className="status-badge status-verified"><BadgeCheck size={14} /> Approved by {doctorName}</span>
            </div>
            {plan.diagnosis && <p className="page-subtitle">For: {plan.diagnosis}</p>}

            {plan.doctorNotes && (
                <div className="card" style={{ padding: 18, marginTop: 18, display: 'flex', gap: 12 }}>
                    <Info size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div><strong>Note from {doctorName}:</strong> {plan.doctorNotes}</div>
                </div>
            )}

            <section className="card" style={{ padding: 22, marginTop: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><Pill size={19} /> Medicines</h2>
                {plan.medicines.length === 0 ? <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No medicines prescribed.</p> : (
                    <div style={{ overflowX: 'auto', marginTop: 12 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 13 }}>
                                    {['Medicine', 'Dose', 'When to take', 'For', 'Notes'].map(h => <th key={h} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {plan.medicines.map((m, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '10px', fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>{m.name}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{m.dosage}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{m.frequency}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{m.duration}</td>
                                        <td style={{ padding: '10px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>{m.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {plan.medicines.length > 0 && (
                    <Link href="/medicines?cart=1" className="btn-secondary" style={{ marginTop: 16 }}><ShoppingCart size={17} /> Medicines added to your cart — review order</Link>
                )}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
                {[
                    { Icon: Salad, title: 'Diet', body: plan.dietGuidance },
                    { Icon: Dumbbell, title: 'Exercise & activity', body: plan.lifestyleGuidance },
                ].map(({ Icon, title, body }) => body && (
                    <section key={title} className="card" style={{ padding: 22 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><Icon size={19} /> {title}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 8, whiteSpace: 'pre-line' }}>{body}</p>
                    </section>
                ))}
            </div>

            {plan.generalInstructions && (
                <section className="card" style={{ padding: 22, marginTop: 16 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700 }}>Instructions</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8, whiteSpace: 'pre-line' }}>{plan.generalInstructions}</p>
                </section>
            )}

            <section className="card" style={{ padding: 22, marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <CalendarCheck size={24} color="var(--color-primary)" />
                <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>Follow-up on {plan.followUpDate ? new Date(plan.followUpDate + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : `day ${plan.followUpDays}`}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14.5 }}>Check in daily on your home screen so {doctorName} can follow your recovery.</div>
                </div>
                <Link href="/journey/patient-portal" className="btn-primary">Go to my daily check-in <ArrowRight size={17} /></Link>
            </section>
        </div>
    );
}
