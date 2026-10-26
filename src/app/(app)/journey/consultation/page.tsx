'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, Building2, Clock, MapPin, ShieldCheck, Mic, CheckCircle2, FileText, CalendarX } from 'lucide-react';
import {
    getActiveJourney, getCurrentUser, getAppointments, getReports, getConsent, setConsent,
    type PatientJourney, type Appointment,
} from '@/lib/store';
import { PLATFORM_DOCTORS } from '@/lib/data';

export default function JourneyConsultationPage() {
    const router = useRouter();
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [consent, setConsentState] = useState({ patient: false, doctor: false });

    useEffect(() => {
        const load = () => {
            const user = getCurrentUser();
            if (!user) { router.push('/auth'); return; }
            const j = getActiveJourney(user.id);
            if (!j) { router.push('/journey/patient-portal'); return; }
            // Doctor finished the consultation and the AI draft exists → follow it to the care plan status
            if (j.draftCarePlanId) { router.push('/journey/care-plan'); return; }
            setJourney(j);
            setAppointment(getAppointments().find(a => a.id === j.appointmentId) || null);
            setConsentState(getConsent(j.id));
        };
        load();
        const id = setInterval(load, 3000); // picks up the doctor's side after each background sync
        return () => clearInterval(id);
    }, [router]);

    if (!journey) return null;

    if (!appointment) {
        return (
            <div className="card" style={{ maxWidth: 520, margin: '20px auto', padding: 28, textAlign: 'center' }}>
                <CalendarX size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>No appointment yet</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '6px 0 18px' }}>Book a doctor to continue your check-in.</p>
                <Link href="/journey/booking" className="btn-primary">Choose a doctor</Link>
            </div>
        );
    }

    const online = journey.consultationMode !== 'Physical';
    const doctor = PLATFORM_DOCTORS.find(d => d.id === appointment.doctorId);
    const toggleConsent = (value: boolean) => {
        setConsent(journey.id, 'patient', value);
        setConsentState(c => ({ ...c, patient: value }));
    };
    const reports = getReports().filter(r => r.sharedWith?.includes(appointment.doctorId));

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 className="page-title">Your consultation</h1>
            <p className="page-subtitle">{online ? 'Your doctor will call you here at the appointment time.' : 'Visit the clinic at your appointment time.'}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 20, alignItems: 'start' }}>
                <section className="card" style={{ padding: 22 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>
                            {doctor?.initials || appointment.doctorName.charAt(4)}
                        </span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>{appointment.doctorName}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14.5 }}>{appointment.specialty}</div>
                        </div>
                    </div>
                    <dl style={{ display: 'grid', gap: 10, marginTop: 18, fontSize: 15 }}>
                        <div style={{ display: 'flex', gap: 10 }}><Clock size={18} color="var(--text-muted)" /> {new Date(appointment.date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}, {appointment.time}</div>
                        <div style={{ display: 'flex', gap: 10 }}>{online ? <Video size={18} color="var(--text-muted)" /> : <Building2 size={18} color="var(--text-muted)" />} {online ? 'Video consultation' : 'In-person visit'}</div>
                        {!online && <div style={{ display: 'flex', gap: 10 }}><MapPin size={18} color="var(--text-muted)" /> {doctor?.hospital}</div>}
                    </dl>
                    <div className="triage-green" style={{ marginTop: 18, padding: 14, borderRadius: 10, fontSize: 14.5 }}>
                        {online
                            ? <>Keep HealthSync open. When {appointment.doctorName} starts the call your phone will ring — tap <strong>Accept</strong>.</>
                            : <>Show this screen at reception. {appointment.doctorName} will start the consultation recorder in the room.</>}
                    </div>
                </section>

                <section className="card" style={{ padding: 22 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><Mic size={19} /> Consultation recording</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, marginTop: 6 }}>
                        With your permission and your doctor’s, the conversation is transcribed so a draft care plan — medicine timings, diet and exercise — can be prepared for your doctor to check and sign.
                    </p>
                    <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 14, padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 15 }}>
                        <input type="checkbox" checked={consent.patient} onChange={e => toggleConsent(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--color-primary)', marginTop: 1 }} />
                        <span>I agree to this consultation being recorded and transcribed for my care plan.</span>
                    </label>
                    <ul style={{ listStyle: 'none', display: 'grid', gap: 6, marginTop: 14, fontSize: 14 }}>
                        {[['You', consent.patient], [appointment.doctorName, consent.doctor]].map(([who, ok]) => (
                            <li key={String(who)} style={{ display: 'flex', gap: 8, alignItems: 'center', color: ok ? 'var(--color-accent)' : 'var(--text-muted)' }}>
                                {ok ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />} {who}: {ok ? 'consented' : 'not yet'}
                            </li>
                        ))}
                    </ul>
                    <p className="field-hint">Recording starts only when both of you have agreed. You can withdraw at any time.</p>
                </section>
            </div>

            <section className="card" style={{ padding: 22, marginTop: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>What your doctor will see</h2>
                <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 200px) 1fr', gap: '10px 16px', marginTop: 14, fontSize: 15 }}>
                    <dt style={{ color: 'var(--text-muted)' }}>Reason for visit</dt><dd>{journey.reasonForVisit || '—'} ({journey.pathway || 'Allopathic'})</dd>
                    {journey.physicianSummary && <><dt style={{ color: 'var(--text-muted)' }}>Your assessment</dt><dd>{journey.physicianSummary}</dd></>}
                    {Object.entries(journey.intakeAnswers || {}).map(([k, v]) => (
                        <div key={k} style={{ display: 'contents' }}>
                            <dt style={{ color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</dt><dd>{String(v)}</dd>
                        </div>
                    ))}
                    <dt style={{ color: 'var(--text-muted)' }}>Reports shared</dt>
                    <dd style={{ display: 'flex', gap: 8, alignItems: 'center' }}><FileText size={16} /> {reports.length} {reports.length === 1 ? 'report' : 'reports'} · <Link href="/journey/reports">add more</Link></dd>
                </dl>
            </section>
        </div>
    );
}
