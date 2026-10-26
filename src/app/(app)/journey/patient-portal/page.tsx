'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowRight, ClipboardPlus, HeartPulse, Pill, FileText, Users, Siren, CalendarDays, Video, Building2,
    Lightbulb, RefreshCw, CheckCircle2, BadgeCheck, PersonStanding,
} from 'lucide-react';
import {
    getCurrentUser, getActiveJourney, getLatestApprovedJourney, getCarePlan, getCheckins, saveCheckin, recoveryRate,
    getAppointments, journeyPath, isInProgress, type UserProfile, type PatientJourney, type CarePlanDraft, type RecoveryCheckin,
} from '@/lib/store';
import { buildAIContext, formatContextForAI } from '@/lib/ai-context';

const STEP_LABEL: Record<string, string> = {
    INTAKE: 'Medical history', MEDIKIOSK: 'Assessment', DIGITAL_TWIN: 'Assessment', BOOKING: 'Choose a doctor',
    REPORTS: 'Reports', TIMELINE: 'Reports', CONSULTATION: 'Consultation', AI_ANALYSIS: 'Care plan', DRAFT_PLAN: 'Care plan', DOCTOR_APPROVAL: 'Doctor review',
};
const FEELINGS = ['Very unwell', 'Unwell', 'Okay', 'Good', 'Very good'];
const today = () => new Date().toISOString().split('T')[0];

export default function PatientPortalPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [inProgress, setInProgress] = useState<PatientJourney | null>(null);
    const [approved, setApproved] = useState<PatientJourney | null>(null);
    const [plan, setPlan] = useState<CarePlanDraft | null>(null);
    const [checkins, setCheckins] = useState<RecoveryCheckin[]>([]);
    const [feeling, setFeeling] = useState(0);
    const [tookMedicines, setTookMedicines] = useState<boolean | null>(null);
    const [insights, setInsights] = useState<{ text: string; type: string }[]>([]);
    const [insightsLoading, setInsightsLoading] = useState(false);

    useEffect(() => {
        const u = getCurrentUser();
        if (!u) { router.push('/auth'); return; }
        setUser(u);
        const active = getActiveJourney(u.id);
        setInProgress(isInProgress(active) ? active : null);
        const done = getLatestApprovedJourney(u.id);
        setApproved(done);
        if (done) {
            setPlan(getCarePlan(done));
            const c = getCheckins(done.id);
            setCheckins(c);
            const t = c.find(x => x.date === today());
            if (t) { setFeeling(t.feeling); setTookMedicines(t.tookMedicines); }
        }
    }, [router]);

    // Restored from the original dashboard: short personalised insights from the patient's own data
    const fetchInsights = async () => {
        setInsightsLoading(true);
        try {
            const res = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: 'generate_insights', text: formatContextForAI(buildAIContext()) }),
            });
            const data = await res.json();
            const match = data.result?.match(/\[[\s\S]*\]/);
            if (match) setInsights(JSON.parse(match[0]).slice(0, 3));
        } catch { /* keep whatever is shown */ }
        setInsightsLoading(false);
    };

    const submitCheckin = () => {
        if (!approved || !feeling || tookMedicines === null) return;
        saveCheckin(approved.id, { date: today(), feeling, tookMedicines });
        setCheckins(getCheckins(approved.id));
    };

    if (!user) return null;

    const rate = recoveryRate(checkins);
    const checkedInToday = checkins.some(c => c.date === today());
    const nextApt = getAppointments()
        .filter(a => a.status === 'booked' && a.date >= today())
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

    return (
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <h1 className="page-title">Hello, {user.name.split(' ')[0]}</h1>
            <p className="page-subtitle">{approved ? 'Here’s your recovery for today.' : 'Your health, in one place.'}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 20, alignItems: 'start' }}>
                {inProgress && (
                    <section className="card" style={{ padding: 22, borderColor: 'var(--color-primary)' }}>
                        <span className="eyebrow">Check-in in progress</span>
                        <h2 style={{ fontSize: 19, fontWeight: 700, marginTop: 6 }}>{inProgress.reasonForVisit || 'Your visit'}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Next step: {STEP_LABEL[inProgress.currentStep] || 'Continue'}</p>
                        <Link href={journeyPath(inProgress.currentStep)} className="btn-primary" style={{ marginTop: 16 }}>Continue <ArrowRight size={17} /></Link>
                    </section>
                )}

                {approved && plan ? (
                    <section className="card" style={{ padding: 22 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                            <div>
                                <span className="eyebrow">Daily check-in</span>
                                <h2 style={{ fontSize: 19, fontWeight: 700, marginTop: 6 }}>How are you feeling today?</h2>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--color-primary)' }}>{rate === null ? '—' : `${rate}%`}</div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Recovery rate (7 days)</div>
                            </div>
                        </div>
                        <fieldset style={{ border: 0, marginTop: 14 }}>
                            <legend className="sr-only">How are you feeling</legend>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                                {FEELINGS.map((f, i) => (
                                    <button key={f} type="button" aria-pressed={feeling === i + 1} onClick={() => setFeeling(i + 1)}
                                        className={feeling === i + 1 ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 4px', fontSize: 12.5, minHeight: 44, flexDirection: 'column', gap: 2 }}>
                                        <b style={{ fontSize: 16 }}>{i + 1}</b>{f}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <fieldset style={{ border: 0, marginTop: 12 }}>
                            <legend className="field-label">Did you take all your medicines today?</legend>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[true, false].map(v => (
                                    <button key={String(v)} type="button" aria-pressed={tookMedicines === v} onClick={() => setTookMedicines(v)}
                                        className={tookMedicines === v ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }}>{v ? 'Yes' : 'Not all'}</button>
                                ))}
                            </div>
                        </fieldset>
                        <button onClick={submitCheckin} className="btn-primary" disabled={!feeling || tookMedicines === null} style={{ width: '100%', marginTop: 14 }}>
                            {checkedInToday ? <><CheckCircle2 size={17} /> Update today’s check-in</> : 'Save check-in'}
                        </button>
                        {checkins.length > 0 && (
                            <div aria-label="Last 7 check-ins" style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 48, marginTop: 16 }}>
                                {checkins.slice(-7).map(c => (
                                    <div key={c.date} title={`${c.date}: feeling ${c.feeling}/5, medicines ${c.tookMedicines ? 'taken' : 'missed'}`}
                                        style={{ flex: 1, height: `${c.feeling * 20}%`, borderRadius: 4, background: c.tookMedicines ? 'var(--color-primary)' : 'var(--color-warning)' }} />
                                ))}
                            </div>
                        )}
                    </section>
                ) : !inProgress && (
                    <section className="card" style={{ padding: 22 }}>
                        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Not feeling well?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Start a check-in, or show us where it hurts on your 3D Digital Twin.</p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                            <Link href="/journey/intake" className="btn-primary"><ClipboardPlus size={17} /> Start a check-in</Link>
                            <Link href="/journey/digital-twin" className="btn-secondary"><PersonStanding size={17} /> Open Digital Twin</Link>
                        </div>
                    </section>
                )}

                {approved && plan && (
                    <section className="card" style={{ padding: 22 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <span className="eyebrow">Today’s medicines</span>
                            <span className="status-badge status-verified"><BadgeCheck size={13} /> Doctor approved</span>
                        </div>
                        <ul style={{ listStyle: 'none', display: 'grid', gap: 10, marginTop: 12 }}>
                            {plan.medicines.map((m, i) => (
                                <li key={i} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
                                    <Pill size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div><strong>{m.name} {m.dosage}</strong><div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{m.frequency}{m.notes ? ` · ${m.notes}` : ''}</div></div>
                                </li>
                            ))}
                            {plan.medicines.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No medicines in your plan.</li>}
                        </ul>
                        <Link href="/journey/care-plan" className="btn-ghost" style={{ marginTop: 8 }}>Full care plan, diet & exercise <ArrowRight size={16} /></Link>
                    </section>
                )}

                {nextApt && (
                    <section className="card" style={{ padding: 22 }}>
                        <span className="eyebrow">Next appointment</span>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
                            {nextApt.location.startsWith('Online') ? <Video size={22} color="var(--color-primary)" /> : <Building2 size={22} color="var(--color-primary)" />}
                            <div>
                                <strong>{nextApt.doctorName}</strong>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <CalendarDays size={13} style={{ verticalAlign: -2 }} /> {nextApt.date} at {nextApt.time} · {nextApt.location}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <section className="card" style={{ padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="eyebrow">Health insights</span>
                        <button onClick={fetchInsights} className="btn-ghost" disabled={insightsLoading} style={{ minHeight: 36, padding: '6px 10px', fontSize: 14 }}>
                            <RefreshCw size={15} className={insightsLoading ? 'animate-spin' : ''} /> {insights.length ? 'Refresh' : 'Get insights'}
                        </button>
                    </div>
                    {insights.length ? (
                        <ul style={{ listStyle: 'none', display: 'grid', gap: 10, marginTop: 12 }}>
                            {insights.map((ins, i) => (
                                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 15 }}><Lightbulb size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} /> {ins.text}</li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', marginTop: 10, fontSize: 15 }}>Personalised tips based on your vitals, reports and care plan.</p>
                    )}
                </section>
            </div>

            <nav aria-label="Quick links" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
                {[
                    { href: '/journey/digital-twin', Icon: PersonStanding, label: 'Digital Twin' },
                    { href: '/vitals', Icon: HeartPulse, label: 'Log vitals' },
                    { href: '/medicines?cart=1', Icon: Pill, label: 'Medicines & cart' },
                    { href: '/prescriptions', Icon: FileText, label: 'Prescriptions' },
                    { href: '/journey/reports', Icon: FileText, label: 'My reports' },
                    { href: '/family', Icon: Users, label: 'Family' },
                    { href: '/emergency', Icon: Siren, label: 'Emergency SOS' },
                ].map(({ href, Icon, label }) => (
                    <Link key={href} href={href} className="card glass-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <Icon size={19} color="var(--color-primary)" /> {label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
