'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Users, Search, Activity, FileText, ChevronLeft, Heart,
    Thermometer, Droplets, Phone, Plus, ClipboardList, Calendar
} from 'lucide-react';
import {
    getCurrentDoctor, getDoctorNotes, addDoctorNote, generateId, type DoctorAccount
} from '@/lib/store';
import { cloudGetDoctorAppointments, cloudGetPatientData } from '@/lib/shared-store';

export default function PatientsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [appointments, setAppointments] = useState<{ userId: string; patientName: string; patientEmail: string; date: string; time: string; status: string; id: string; doctorId: string; doctorName: string; specialty: string; location: string; notes: string }[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [patientData, setPatientDataState] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState<'consultation' | 'follow-up' | 'general'>('consultation');
    const [patientNotes, setPatientNotes] = useState<ReturnType<typeof getDoctorNotes>>([]);

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        (async () => {
            const apts = await cloudGetDoctorAppointments(doc.id);
            setAppointments(apts);
            const urlId = searchParams.get('id');
            if (urlId) viewPatient(urlId, doc.id);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const viewPatient = async (userId: string, docId?: string) => {
        const did = docId || doctor?.id || '';
        setSelectedPatient(userId);
        const pd = await cloudGetPatientData(userId, did);
        setPatientDataState(pd);
        setPatientNotes(getDoctorNotes(did, userId));
        setActiveTab('overview');
    };

    const addNote = () => {
        if (!noteText.trim() || !doctor || !selectedPatient || !patientData) return;
        const note = {
            id: generateId(), doctorId: doctor.id, patientId: selectedPatient,
            patientName: patientData.profile.name, date: new Date().toISOString(),
            content: noteText.trim(), type: noteType,
        };
        addDoctorNote(note);
        setPatientNotes(getDoctorNotes(doctor.id, selectedPatient));
        setNoteText('');
    };

    // Get unique patients
    const patientMap = new Map<string, { name: string; email: string; userId: string; lastDate: string }>();
    appointments.forEach(a => {
        if (!patientMap.has(a.userId) || a.date > (patientMap.get(a.userId)?.lastDate || '')) {
            patientMap.set(a.userId, { name: a.patientName, email: a.patientEmail, userId: a.userId, lastDate: a.date });
        }
    });
    const patients = Array.from(patientMap.values()).filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'vitals', label: 'Vitals', icon: Heart },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'notes', label: 'Notes', icon: ClipboardList },
    ];

    const vitalIcons: Record<string, { icon: typeof Heart; color: string }> = {
        bp: { icon: Heart, color: '#EF4444' },
        heartRate: { icon: Activity, color: '#F59E0B' },
        sugar: { icon: Droplets, color: '#0EA5E9' },
        temperature: { icon: Thermometer, color: '#10B981' },
    };

    if (!doctor) return null;

    return (
        <div>
            {!selectedPatient ? (
                <>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>My Patients</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>{patients.length} patients in your care</p>

                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: 20 }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input-field" placeholder="Search patients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 40 }} />
                    </div>

                    {patients.length === 0 ? (
                        <div className="glass-card-static" style={{ padding: 50, textAlign: 'center' }}>
                            <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ color: 'var(--text-muted)' }}>No patients yet. They&apos;ll appear when they book appointments.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {patients.map((p, i) => (
                                <motion.div key={p.userId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                    className="glass-card" style={{ padding: 18, cursor: 'pointer' }}
                                    onClick={() => viewPatient(p.userId)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last: {new Date(p.lastDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* Patient Detail */
                <div>
                    <button onClick={() => setSelectedPatient(null)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                        color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0,
                    }}><ChevronLeft size={16} /> Back to Patients</button>

                    {patientData ? (
                        <>
                            {/* Patient Header */}
                            <div className="glass-card-static" style={{ padding: 22, marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20 }}>
                                        {patientData.profile.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{patientData.profile.name}</h2>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {patientData.profile.email} • {patientData.profile.phone || 'No phone'}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                            Age: {patientData.profile.age || 'N/A'} • {patientData.profile.gender || 'N/A'} • {patientData.profile.activityLevel || 'N/A'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => router.push(`/doctor-dashboard/prescriptions?patient=${selectedPatient}`)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                                            <FileText size={14} style={{ marginRight: 4 }} /> Prescribe
                                        </button>
                                        <button onClick={() => router.push(`/doctor-dashboard/calls?patient=${selectedPatient}`)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }}>
                                            <Phone size={14} style={{ marginRight: 4 }} /> Call
                                        </button>
                                    </div>
                                </div>
                                {patientData.profile.existingConditions?.length > 0 && (
                                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {patientData.profile.existingConditions.map((c: string) => (
                                            <span key={c} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontWeight: 600 }}>{c}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 2 }}>
                                {tabs.map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                            padding: '10px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                                            background: activeTab === tab.id ? 'rgba(14,165,233,0.1)' : 'transparent',
                                            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
                                            fontWeight: activeTab === tab.id ? 600 : 500, fontSize: 13,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                                        }}>
                                            <Icon size={14} /> {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'overview' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="glass-card-static" style={{ padding: 18 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> Recent Vitals</h3>
                                        {patientData.vitals.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No vitals</p> : (
                                            patientData.vitals.slice(-5).map((v: { id: string; type: string; value: string; unit: string; date: string }, i: number) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>{v.type.toUpperCase()}</span>
                                                    <span style={{ fontWeight: 600 }}>{v.value} {v.unit}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="glass-card-static" style={{ padding: 18 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Reports Shared</h3>
                                        {patientData.reports.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No shared reports</p> : (
                                            patientData.reports.map((r: { id: string; fileName: string; aiSummary: string }, i: number) => (
                                                <div key={i} style={{ padding: 8, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: 6 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{r.fileName}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.aiSummary?.substring(0, 60)}...</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="glass-card-static" style={{ padding: 18, gridColumn: '1 / -1' }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Prescriptions</h3>
                                        {(patientData.prescriptions || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No prescriptions sent yet</p> : (
                                            (patientData.prescriptions || []).map((p: { id: string; diagnosis: string; date: string; medicines: { name: string }[] }, i: number) => (
                                                <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: 6 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.diagnosis}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.medicines.map(m => m.name).join(', ')} • {new Date(p.date).toLocaleDateString()}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'vitals' && (
                                <div className="glass-card-static" style={{ padding: 20 }}>
                                    {patientData.vitals.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No vitals recorded</p> : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {patientData.vitals.slice().reverse().map((v: { id: string; type: string; value: string; unit: string; date: string; time: string }, i: number) => {
                                                const vi = vitalIcons[v.type] || { icon: Activity, color: '#888' };
                                                const VIcon = vi.icon;
                                                return (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <VIcon size={16} style={{ color: vi.color }} />
                                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{v.type.toUpperCase()}</span>
                                                        </div>
                                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{v.value} {v.unit}</span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(v.date).toLocaleDateString()} {v.time}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'reports' && (
                                <div className="glass-card-static" style={{ padding: 20 }}>
                                    {patientData.reports.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No shared reports</p> : (
                                        patientData.reports.map((r: { id: string; fileName: string; aiSummary: string; technicalSummary: string; abnormalities: string[]; recommendations: string[]; uploadDate: string; urgencyLevel?: string }, i: number) => (
                                            <div key={i} className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.fileName}</div>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                        background: r.urgencyLevel === 'red' ? 'rgba(239,68,68,0.1)' : r.urgencyLevel === 'amber' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                        color: r.urgencyLevel === 'red' ? '#EF4444' : r.urgencyLevel === 'amber' ? '#F59E0B' : '#10B981',
                                                    }}>{r.urgencyLevel || 'green'}</span>
                                                </div>
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{r.aiSummary}</p>
                                                {r.technicalSummary && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>{r.technicalSummary}</p>}
                                                {r.abnormalities?.length > 0 && (
                                                    <div style={{ marginBottom: 6 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444' }}>Abnormalities:</span>
                                                        <ul style={{ margin: '4px 0 0 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                            {r.abnormalities.map((a, j) => <li key={j}>{a}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Uploaded: {new Date(r.uploadDate).toLocaleDateString()}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div>
                                    {/* Add Note */}
                                    <div className="glass-card-static" style={{ padding: 18, marginBottom: 16 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Add Note</h3>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                            {(['consultation', 'follow-up', 'general'] as const).map(t => (
                                                <button key={t} onClick={() => setNoteType(t)} style={{
                                                    padding: '5px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border-color)',
                                                    background: noteType === t ? 'rgba(14,165,233,0.1)' : 'var(--bg-card)',
                                                    color: noteType === t ? 'var(--color-primary)' : 'var(--text-muted)',
                                                    cursor: 'pointer', fontWeight: noteType === t ? 600 : 400, textTransform: 'capitalize',
                                                }}>{t}</button>
                                            ))}
                                        </div>
                                        <textarea className="input-field" value={noteText} onChange={e => setNoteText(e.target.value)}
                                            placeholder="Write clinical notes..." rows={3} style={{ resize: 'vertical', marginBottom: 10 }} />
                                        <button className="btn-primary" onClick={addNote} disabled={!noteText.trim()} style={{ padding: '8px 20px', fontSize: 13 }}>
                                            <Plus size={14} style={{ marginRight: 4 }} /> Save Note
                                        </button>
                                    </div>
                                    {/* Note History */}
                                    {patientNotes.length === 0 ? (
                                        <div className="glass-card-static" style={{ padding: 30, textAlign: 'center' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet for this patient</p>
                                        </div>
                                    ) : (
                                        patientNotes.slice().reverse().map((n, i) => (
                                            <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                                                        background: n.type === 'consultation' ? 'rgba(14,165,233,0.1)' : n.type === 'follow-up' ? 'rgba(139,92,246,0.1)' : 'rgba(128,128,128,0.1)',
                                                        color: n.type === 'consultation' ? '#0EA5E9' : n.type === 'follow-up' ? '#8B5CF6' : 'var(--text-muted)',
                                                    }}>{n.type}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.date).toLocaleString()}</span>
                                                </div>
                                                <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="glass-card-static" style={{ padding: 40, textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Patient data not available.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
