'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, Clock, MapPin, Video, Building2, CheckCircle2, ArrowRight, BadgeCheck } from 'lucide-react';
import {
    getActiveJourney, getCurrentUser, saveJourney, addAppointment, addNotification, autoShareReportsWithDoctor, generateId,
    JourneyStep, type PatientJourney,
} from '@/lib/store';
import { PLATFORM_DOCTORS } from '@/lib/data';

type Doctor = typeof PLATFORM_DOCTORS[number];

const nextDays = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
});
const dayLabel = (iso: string, i: number) => i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(iso + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function JourneyBookingPage() {
    const router = useRouter();
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Doctor | null>(null);
    const [mode, setMode] = useState<'Online' | 'Physical'>('Online');
    const [date, setDate] = useState(nextDays()[0]);
    const [time, setTime] = useState('');
    const [booked, setBooked] = useState(false);

    const choose = (d: Doctor) => {
        setSelected(d);
        setMode(d.modes.includes('Online') ? 'Online' : 'Physical');
        setTime('');
    };

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) { router.push('/auth'); return; }
        const j = getActiveJourney(user.id);
        if (!j) { router.push('/auth'); return; }
        setJourney(j);
        const preselect = PLATFORM_DOCTORS.find(d => d.id === new URLSearchParams(window.location.search).get('doctor'));
        if (preselect) choose(preselect);
    }, [router]);

    if (!journey) return null;

    const ayush = journey.pathway === 'AYUSH';
    const q = search.toLowerCase();
    const doctors = PLATFORM_DOCTORS
        .filter(d => (d.type === 'Allopathic') !== ayush)
        .filter(d => !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
        // Recommended specialty first
        .sort((a, b) => Number(b.specialty === journey.recommendedSpecialty) - Number(a.specialty === journey.recommendedSpecialty) || b.rating - a.rating);

    const handleBook = () => {
        const user = getCurrentUser();
        if (!selected || !time || !user) return;
        const appointmentId = generateId();
        addAppointment({
            id: appointmentId, userId: user.id, doctorId: selected.id, doctorName: selected.name, specialty: selected.specialty,
            date, time, status: 'booked',
            location: mode === 'Online' ? 'Online video consultation' : `${selected.hospital} (in person)`,
            notes: journey.reasonForVisit || 'Journey consultation',
        });
        addNotification({
            id: generateId(), userId: user.id, type: 'appointment', title: 'Appointment booked',
            message: `${mode} consultation with ${selected.name} on ${date} at ${time}.`,
            timestamp: new Date().toISOString(), read: false, link: '/journey/consultation',
        });
        // Doctor sees the patient's existing reports before the visit
        autoShareReportsWithDoctor(user.id, selected.id);
        saveJourney({
            ...journey, doctorId: selected.id, appointmentId, consultationMode: mode,
            currentStep: JourneyStep.REPORTS, updatedAt: new Date().toISOString(),
        });
        setBooked(true);
        setTimeout(() => router.push('/journey/reports'), 1200);
    };

    if (booked && selected) {
        return (
            <div className="card" role="status" style={{ maxWidth: 520, margin: '40px auto', padding: 32, textAlign: 'center' }}>
                <CheckCircle2 size={48} color="var(--color-accent)" style={{ margin: '0 auto 12px' }} />
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>Appointment booked</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{mode} with {selected.name} · {date} at {time}</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <h1 className="page-title">Choose your doctor</h1>
            <p className="page-subtitle">
                {journey.recommendedSpecialty
                    ? <>Based on your assessment we recommend a <strong>{journey.recommendedSpecialty}</strong>. They’re listed first.</>
                    : 'Pick a doctor, then a time that suits you.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 20, alignItems: 'start' }}>
                <section>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                        <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
                        <label htmlFor="doc-search" className="sr-only">Search doctors</label>
                        <input id="doc-search" className="input-field" style={{ paddingLeft: 42 }} placeholder="Search by name or specialty" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                        {doctors.map(d => {
                            const rec = d.specialty === journey.recommendedSpecialty;
                            const active = selected?.id === d.id;
                            return (
                                <button key={d.id} onClick={() => choose(d)} aria-pressed={active} className="glass-card" style={{
                                    padding: 16, display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', font: 'inherit', color: 'inherit',
                                    borderColor: active ? 'var(--color-primary)' : undefined, boxShadow: active ? '0 0 0 2px var(--primary-soft)' : undefined,
                                }}>
                                    <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>{d.initials}</span>
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong>{d.name}</strong>
                                            {rec && <span className="status-badge status-active"><BadgeCheck size={13} /> Recommended</span>}
                                        </span>
                                        <span style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)' }}>{d.specialty} · {d.hospital}</span>
                                        <span style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                            <span><Star size={12} color="#D97706" fill="#D97706" /> {d.rating}</span>
                                            <span><Clock size={12} /> {d.experience}</span>
                                            <span>{d.fee}</span>
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        {doctors.length === 0 && <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>No doctors match “{search}”.</p>}
                    </div>
                </section>

                <section className="card" style={{ padding: 22, position: 'sticky', top: 20 }} aria-label="Appointment details">
                    {!selected ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Select a doctor to see available times.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 18 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.name}</div>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={14} /> {selected.hospital}</div>
                            </div>
                            <fieldset style={{ border: 0 }}>
                                <legend className="field-label">How would you like to meet?</legend>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {(['Online', 'Physical'] as const).map(m => {
                                        const offered = selected.modes.includes(m);
                                        return (
                                            <button key={m} type="button" disabled={!offered} aria-pressed={mode === m} onClick={() => setMode(m)}
                                                className={mode === m ? 'btn-primary' : 'btn-secondary'} style={{ padding: '10px 12px', fontSize: 14 }}>
                                                {m === 'Online' ? <Video size={16} /> : <Building2 size={16} />} {m === 'Online' ? 'Video call' : 'At clinic'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>
                            <fieldset style={{ border: 0 }}>
                                <legend className="field-label">Day</legend>
                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                    {nextDays().map((d, i) => (
                                        <button key={d} type="button" aria-pressed={date === d} onClick={() => setDate(d)}
                                            className={date === d ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 13.5, whiteSpace: 'nowrap', minHeight: 40 }}>
                                            {dayLabel(d, i)}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <fieldset style={{ border: 0 }}>
                                <legend className="field-label">Time</legend>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 8 }}>
                                    {selected.available.map(t => (
                                        <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)}
                                            className={time === t ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 10px', fontSize: 13.5, minHeight: 40 }}>{t}</button>
                                    ))}
                                </div>
                            </fieldset>
                            <button onClick={handleBook} className="btn-primary" disabled={!time}>
                                Book {mode === 'Online' ? 'video consultation' : 'clinic visit'} · {selected.fee} <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
