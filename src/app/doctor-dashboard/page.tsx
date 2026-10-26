'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, Calendar, Clock, FileText, Phone, Plus, Video, Mic, ChevronRight, AlertTriangle, BadgeCheck, Activity, Building2,
} from 'lucide-react';
import {
    getCurrentDoctor, getDoctorAppointments, getDoctorPrescriptions, getCallLogs, getDoctorJourneys, getCarePlan,
    getIntakeSummaries, getCheckins, recoveryRate,
    type DoctorAccount, type JourneyWithPatient, type ClinicalIntakeSummary,
} from '@/lib/store';

type Apt = ReturnType<typeof getDoctorAppointments>[number];

function PatientRow({ name, sub, right, href }: { name: string; sub: React.ReactNode; right?: React.ReactNode; href: string }) {
    return (
        <Link href={href} className="card glass-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>{name.charAt(0)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{name}</span>
                <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-secondary)' }}>{sub}</span>
            </span>
            {right}
            <ChevronRight size={16} color="var(--text-muted)" />
        </Link>
    );
}

export default function DoctorDashboard() {
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [appointments, setAppointments] = useState<Apt[]>([]);
    const [journeys, setJourneys] = useState<JourneyWithPatient[]>([]);
    const [prescriptionCount, setPrescriptionCount] = useState(0);
    const [callCount, setCallCount] = useState(0);
    const [kioskSummaries, setKioskSummaries] = useState<ClinicalIntakeSummary[]>([]);

    useEffect(() => {
        const load = () => {
            const doc = getCurrentDoctor();
            if (!doc) return;
            setDoctor(doc);
            const apts = getDoctorAppointments(doc.id);
            setAppointments(apts);
            setJourneys(getDoctorJourneys(doc.id));
            setPrescriptionCount(getDoctorPrescriptions(doc.id).length);
            setCallCount(getCallLogs(doc.id, 'doctor').length);
            // MediKiosk intakes from this doctor's patients
            setKioskSummaries([...new Set(apts.map(a => a.userId))].flatMap(getIntakeSummaries).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6));
        };
        load();
        const id = setInterval(load, 5000); // new bookings and drafts arrive via background sync
        return () => clearInterval(id);
    }, []);

    if (!doctor) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayApts = appointments.filter(a => a.date === todayStr);
    const withPlan = journeys.map(j => ({ j, plan: getCarePlan(j) }));
    const awaiting = withPlan.filter(x => x.plan?.status === 'draft');
    const queue = withPlan.filter(x => !x.plan && x.j.appointmentId);
    const recovering = withPlan.filter(x => x.plan?.status === 'approved');
    const aptFor = (j: JourneyWithPatient) => appointments.find(a => a.id === j.appointmentId);

    const stats = [
        { label: 'Patients', value: new Set(appointments.map(a => a.userId)).size, icon: Users },
        { label: "Today's appointments", value: todayApts.length, icon: Calendar },
        { label: 'Awaiting approval', value: awaiting.length, icon: AlertTriangle },
        { label: 'Prescriptions sent', value: prescriptionCount, icon: FileText },
        { label: 'Calls', value: callCount, icon: Phone },
    ];

    const quickActions = [
        { label: 'View patients', icon: Users, href: '/doctor-dashboard/patients' },
        { label: 'Write prescription', icon: FileText, href: '/doctor-dashboard/prescriptions' },
        { label: 'Start call', icon: Phone, href: '/doctor-dashboard/calls' },
        { label: 'Record visit', icon: Mic, href: '/doctor-dashboard/recorder' },
        { label: 'Add note', icon: Plus, href: '/doctor-dashboard/notes' },
    ];

    return (
        <div>
            <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {doctor.name}</h1>
            <p className="page-subtitle">{doctor.specialty} · {doctor.hospital}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, margin: '20px 0 24px' }}>
                {stats.map(s => (
                    <div key={s.label} className="card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13.5 }}><s.icon size={16} /> {s.label}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginTop: 6 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>
                <section>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={18} color="var(--color-warning)" /> Awaiting your approval</h2>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {awaiting.length === 0 && <p className="card" style={{ padding: 16, color: 'var(--text-muted)' }}>No care plans waiting.</p>}
                        {awaiting.map(({ j, plan }) => (
                            <PatientRow key={j.id} name={j.patient.name} href={`/doctor-dashboard/case/${j.id}`}
                                sub={`${plan?.diagnosis || j.reasonForVisit} · drafted ${new Date(plan!.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
                                right={<span className="status-badge status-pending">Review</span>} />
                        ))}
                    </div>

                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '22px 0 10px', display: 'flex', gap: 8, alignItems: 'center' }}><Calendar size={18} /> Consultation queue</h2>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {queue.length === 0 && <p className="card" style={{ padding: 16, color: 'var(--text-muted)' }}>No upcoming journey consultations.</p>}
                        {queue.map(({ j }) => {
                            const apt = aptFor(j);
                            const online = j.consultationMode !== 'Physical';
                            return (
                                <div key={j.id} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ flex: 1, minWidth: 180 }}>
                                        <Link href={`/doctor-dashboard/case/${j.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{j.patient.name}</Link>
                                        <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                                            {online ? <Video size={13} style={{ verticalAlign: -2 }} /> : <Building2 size={13} style={{ verticalAlign: -2 }} />} {apt ? `${apt.date} · ${apt.time}` : 'Booked'} · {j.reasonForVisit}
                                        </span>
                                    </span>
                                    {online
                                        ? <Link href={`/doctor-dashboard/calls?patient=${j.patient.id}`} className="btn-primary" style={{ minHeight: 38, padding: '6px 14px', fontSize: 14 }}><Video size={15} /> Start call</Link>
                                        : <Link href={`/doctor-dashboard/recorder?patient=${j.patient.id}`} className="btn-primary" style={{ minHeight: 38, padding: '6px 14px', fontSize: 14 }}><Mic size={15} /> Record visit</Link>}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}><Activity size={18} color="var(--color-accent)" /> Recovering patients</h2>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {recovering.length === 0 && <p className="card" style={{ padding: 16, color: 'var(--text-muted)' }}>Approved plans and daily recovery rates appear here.</p>}
                        {recovering.map(({ j, plan }) => {
                            const rate = recoveryRate(getCheckins(j.id));
                            return (
                                <PatientRow key={j.id} name={j.patient.name} href={`/doctor-dashboard/case/${j.id}`}
                                    sub={<><BadgeCheck size={13} style={{ verticalAlign: -2 }} /> {plan?.diagnosis || j.reasonForVisit} · follow-up {plan?.followUpDate}</>}
                                    right={<strong style={{ color: 'var(--color-primary)' }}>{rate === null ? 'No check-ins' : `${rate}%`}</strong>} />
                            );
                        })}
                    </div>

                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '22px 0 10px' }}>Quick actions</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                        {quickActions.map(a => (
                            <Link key={a.href} href={a.href} className="card glass-card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
                                <a.icon size={18} color="var(--color-primary)" /> {a.label}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            {kioskSummaries.length > 0 && (
                <section style={{ marginTop: 28 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Recent MediKiosk intakes</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                        {kioskSummaries.map(s => (
                            <article key={s.id} className="card" style={{ padding: 18, fontSize: 14.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <strong>{s.patientName || 'Patient'}</strong>
                                    <span className="status-badge status-active">{s.consultationType}</span>
                                </div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>ABHA: {s.abhaId || 'not linked'} · {new Date(s.date).toLocaleDateString('en-IN')}</div>
                                <p style={{ marginTop: 8 }}><strong>Complaint:</strong> {s.chiefComplaint}</p>
                                {s.pastMedicalHistory && <p><strong>History:</strong> {s.pastMedicalHistory}</p>}
                                {s.drugAllergyHistory && <p><strong>Allergies:</strong> {s.drugAllergyHistory}</p>}
                                {s.recommendedSpecialty && <p><strong>Suggested:</strong> {s.recommendedSpecialty}</p>}
                                {s.redFlags?.length > 0 && <p style={{ color: 'var(--color-danger)', fontWeight: 600, marginTop: 6 }}><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {s.redFlags.length} red flag(s)</p>}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section style={{ marginTop: 28 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Today’s appointments</h2>
                <div style={{ display: 'grid', gap: 8 }}>
                    {todayApts.length === 0 && <p className="card" style={{ padding: 16, color: 'var(--text-muted)' }}>No appointments today.</p>}
                    {todayApts.map(a => (
                        <PatientRow key={a.id} name={a.patientName} href={`/doctor-dashboard/patients?id=${a.userId}`} sub={<><Clock size={13} style={{ verticalAlign: -2 }} /> {a.time} · {a.location}</>} />
                    ))}
                </div>
            </section>

            {appointments.length > 0 && (
                <section style={{ marginTop: 28 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>All appointments</h2>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {appointments.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 10).map(a => (
                            <PatientRow key={a.id} name={a.patientName} href={`/doctor-dashboard/patients?id=${a.userId}`}
                                sub={`${new Date(a.date + 'T00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at ${a.time}`}
                                right={<span className={`status-badge ${a.status === 'booked' ? 'status-active' : a.status === 'completed' ? 'status-completed' : 'triage-red'}`}>{a.status}</span>} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
