'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Users, Calendar, Clock, FileText, Phone, Plus,
    TrendingUp, Activity, ChevronRight, Bell
} from 'lucide-react';
import {
    getCurrentDoctor, getDoctorNotes, type DoctorAccount
} from '@/lib/store';
import { cloudGetDoctorAppointments, cloudGetDoctorPrescriptions, cloudGetCallLogs } from '@/lib/shared-store';

export default function DoctorDashboard() {
    const router = useRouter();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [appointments, setAppointments] = useState<{ userId: string; patientName: string; patientEmail: string; date: string; time: string; status: string; id: string; doctorId: string; doctorName: string; specialty: string; location: string; notes: string }[]>([]);
    const [prescriptionCount, setPrescriptionCount] = useState(0);
    const [callCount, setCallCount] = useState(0);
    const [noteCount, setNoteCount] = useState(0);

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        setNoteCount(getDoctorNotes(doc.id).length);
        // Fetch shared data from cloud
        (async () => {
            const [apts, presc, calls] = await Promise.all([
                cloudGetDoctorAppointments(doc.id),
                cloudGetDoctorPrescriptions(doc.id),
                cloudGetCallLogs(doc.id, 'doctor'),
            ]);
            setAppointments(apts);
            setPrescriptionCount(presc.length);
            setCallCount(calls.length);
        })();
    }, []);

    if (!doctor) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayApts = appointments.filter(a => a.date === todayStr);
    const uniquePatients = new Set(appointments.map(a => a.userId));

    const stats = [
        { label: 'Total Patients', value: uniquePatients.size, icon: Users, color: '#0EA5E9' },
        { label: "Today's Appointments", value: todayApts.length, icon: Calendar, color: '#10B981' },
        { label: 'Prescriptions Sent', value: prescriptionCount, icon: FileText, color: '#8B5CF6' },
        { label: 'Calls Made', value: callCount, icon: Phone, color: '#F59E0B' },
    ];

    const quickActions = [
        { label: 'View Patients', icon: Users, href: '/doctor-dashboard/patients', color: '#0EA5E9' },
        { label: 'Write Prescription', icon: FileText, href: '/doctor-dashboard/prescriptions', color: '#8B5CF6' },
        { label: 'Start Call', icon: Phone, href: '/doctor-dashboard/calls', color: '#10B981' },
        { label: 'Add Note', icon: Plus, href: '/doctor-dashboard/notes', color: '#F59E0B' },
    ];

    return (
        <div>
            {/* Welcome */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>Welcome back, {doctor.name.split(' ')[1] || doctor.name}</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{doctor.specialty} • {doctor.hospital}</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card-static" style={{ padding: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={20} style={{ color: stat.color }} />
                                </div>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stat.label}</span>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 800 }}>{stat.value}</div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Quick Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
                {quickActions.map((action, i) => {
                    const Icon = action.icon;
                    return (
                        <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => router.push(action.href)} className="glass-card"
                            style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-primary)', textAlign: 'left' }}>
                            <Icon size={20} style={{ color: action.color }} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{action.label}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Today's Appointments */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Today&apos;s Appointments</h2>
            {todayApts.length === 0 ? (
                <div className="glass-card-static" style={{ padding: 40, textAlign: 'center' }}>
                    <Calendar size={36} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No appointments scheduled for today</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {todayApts.map((apt, i) => (
                        <motion.div key={apt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className="glass-card" style={{ padding: 18, cursor: 'pointer' }}
                            onClick={() => router.push(`/doctor-dashboard/patients?id=${apt.userId}`)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                        {apt.patientName?.charAt(0) || 'P'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{apt.patientName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <Clock size={12} /> {apt.time}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Recent Appointments (All) */}
            {appointments.length > 0 && (
                <>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, marginTop: 28 }}>All Appointments</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {appointments.slice(0, 10).map((apt, i) => (
                            <motion.div key={apt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="glass-card" style={{ padding: 16, cursor: 'pointer' }}
                                onClick={() => router.push(`/doctor-dashboard/patients?id=${apt.userId}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                                            {apt.patientName?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{apt.patientName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(apt.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })} at {apt.time}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: apt.status === 'booked' ? 'rgba(14,165,233,0.1)' : apt.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: apt.status === 'booked' ? '#0EA5E9' : apt.status === 'completed' ? '#10B981' : '#EF4444',
                                    }}>{apt.status}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
