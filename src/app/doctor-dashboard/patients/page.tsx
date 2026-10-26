'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Users, Search, Activity, FileText, ChevronLeft, Heart,
    Thermometer, Droplets, Phone, Plus, ClipboardList, Calendar, ClipboardCheck, ShieldAlert, Leaf, MessageSquare, Map as MapIcon
} from 'lucide-react';
import {
    getCurrentDoctor, getDoctorAppointments, getPatientData,
    getDoctorNotes, addDoctorNote, generateId, type DoctorAccount,
    getAllUsers, type UserProfile
} from '@/lib/store';

export default function PatientsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [appointments, setAppointments] = useState<ReturnType<typeof getDoctorAppointments>>([]);
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    const [patientData, setPatientDataState] = useState<ReturnType<typeof getPatientData>>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState<'consultation' | 'follow-up' | 'general'>('consultation');
    const [patientNotes, setPatientNotes] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        setAllUsers(getAllUsers());
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        setAppointments(getDoctorAppointments(doc.id));
        const urlId = searchParams.get('id');
        if (urlId) viewPatient(urlId, doc.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (!e.key || e.key.startsWith('hs_vitals') || e.key.startsWith('hs_reports') || e.key.startsWith('hs_intake')) {
                if (selectedPatient && doctor) {
                    setPatientDataState(getPatientData(selectedPatient, doctor.id));
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [selectedPatient, doctor]);

    const viewPatient = (userId: string, docId?: string) => {
        const did = docId || doctor?.id || '';
        setSelectedPatient(userId);
        setPatientDataState(getPatientData(userId, did));
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
    const patientMap = new Map<string, { name: string; email: string; userId: string; lastDate: string; avatar?: string }>();
    // Add users from appointments
    appointments.forEach(a => {
        const u = allUsers.find(u => u.id === a.userId);
        if (!patientMap.has(a.userId) || new Date(a.date) > new Date(patientMap.get(a.userId)!.lastDate)) {
            patientMap.set(a.userId, {
                name: a.patientName || 'Unknown Patient',
                email: u?.email || 'patient@example.com',
                userId: a.userId,
                lastDate: a.date,
                avatar: u?.avatar
            });
        }
    });

    // Add all other users in the system (e.g. from Kiosk)
    allUsers.forEach(u => {
        if (!patientMap.has(u.id)) {
            patientMap.set(u.id, {
                name: u.name || 'Unknown Patient',
                email: u.email || 'patient@example.com',
                userId: u.id,
                lastDate: new Date().toISOString(),
                avatar: u.avatar
            });
        }
    });
    const patients = Array.from(patientMap.values()).filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.userId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'intake', label: 'Intake Summary', icon: ClipboardCheck },
        { id: 'activity', label: 'Patient Activity', icon: MapIcon },
        { id: 'vitals', label: 'Vitals', icon: Heart },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'notes', label: 'Notes', icon: ClipboardList },
    ];

    const vitalIcons: Record<string, { icon: typeof Heart; color: string }> = {
        bp: { icon: Heart, color: '#DC2626' },
        heartRate: { icon: Activity, color: '#D97706' },
        sugar: { icon: Droplets, color: '#0E7490' },
        temperature: { icon: Thermometer, color: '#059669' },
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
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, overflow: 'hidden' }}>
                                                {p.avatar ? (
                                                    <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    p.name.charAt(0)
                                                )}
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
                                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20, overflow: 'hidden' }}>
                                        {patientData.profile.avatar ? (
                                            <img src={patientData.profile.avatar} alt={patientData.profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            patientData.profile.name.charAt(0)
                                        )}
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
                                        {patientData.profile.existingConditions.map(c => (
                                            <span key={c} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(217, 119, 6,0.1)', color: '#D97706', fontWeight: 600 }}>{c}</span>
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
                                            background: activeTab === tab.id ? 'rgba(14, 116, 144,0.1)' : 'transparent',
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

                            {activeTab === 'intake' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {(!patientData.intakeSummaries || patientData.intakeSummaries.length === 0) ? (
                                        <div className="glass-card-static" style={{ padding: 40, textAlign: 'center' }}>
                                            <ClipboardCheck size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.3 }} />
                                            <p style={{ color: 'var(--text-muted)' }}>No AI Intake summaries found for this patient.</p>
                                        </div>
                                    ) : (
                                        patientData.intakeSummaries.slice().reverse().map((summary: any, i: number) => (
                                            <div key={summary.id} className="glass-card-static" style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                                                    <h3 style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <ClipboardCheck size={18} color="var(--color-primary)" /> Clinical Intake Summary
                                                    </h3>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {new Date(summary.date).toLocaleString()} • {summary.consultationType}
                                                    </div>
                                                </div>

                                                {summary.redFlags && summary.redFlags.length > 0 && (
                                                    <div style={{ background: '#FEF2F2', border: '1px solid #DC2626', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', gap: 10, color: '#DC2626' }}>
                                                        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Red Flags Detected</div>
                                                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                                                                {summary.redFlags.map((flag: string, j: number) => <li key={j}>{flag}</li>)}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Chief Complaint</div>
                                                        <div style={{ fontSize: 14, fontWeight: 500 }}>{summary.chiefComplaint || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>History of Present Illness (HPI)</div>
                                                        <div style={{ fontSize: 14 }}>{summary.hpi || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Past Medical History</div>
                                                        <div style={{ fontSize: 14 }}>{summary.pastMedicalHistory || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Drug / Allergy History</div>
                                                        <div style={{ fontSize: 14 }}>{summary.drugAllergyHistory || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Review of Systems (ROS)</div>
                                                        <div style={{ fontSize: 14 }}>{summary.reviewOfSystems || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Family & Genetic History</div>
                                                        <div style={{ fontSize: 14 }}>{summary.familyHistory || 'N/A'}</div>
                                                    </div>

                                                    {summary.consultationType === 'AYUSH' && (
                                                        <>
                                                            <div style={{ gridColumn: '1 / -1', marginTop: 8, paddingTop: 16, borderTop: '1px dashed var(--border-color)' }}>
                                                                <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <Leaf size={14} /> AYUSH Profile
                                                                </h4>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Prakriti (Constitution)</div>
                                                                        <div style={{ fontSize: 14 }}>{summary.prakriti || 'N/A'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Vikriti (Imbalance)</div>
                                                                        <div style={{ fontSize: 14 }}>{summary.vikriti || 'N/A'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Agni (Digestion)</div>
                                                                        <div style={{ fontSize: 14 }}>{summary.agni || 'N/A'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Ahara-Vihara (Diet & Lifestyle)</div>
                                                                        <div style={{ fontSize: 14 }}>{summary.aharaVihara || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {summary.transcript && (
                                                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                                                        <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <MessageSquare size={14} /> Raw Conversation Transcript
                                                        </h4>
                                                        <div style={{ background: 'var(--bg-default)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', maxHeight: 300, overflowY: 'auto', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                            {summary.transcript}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
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
                                                        background: r.urgencyLevel === 'red' ? 'rgba(220, 38, 38,0.1)' : r.urgencyLevel === 'amber' ? 'rgba(217, 119, 6,0.1)' : 'rgba(5, 150, 105,0.1)',
                                                        color: r.urgencyLevel === 'red' ? '#DC2626' : r.urgencyLevel === 'amber' ? '#D97706' : '#059669',
                                                    }}>{r.urgencyLevel || 'green'}</span>
                                                </div>
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{r.aiSummary}</p>
                                                {r.technicalSummary && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>{r.technicalSummary}</p>}
                                                {r.abnormalities?.length > 0 && (
                                                    <div style={{ marginBottom: 6 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>Abnormalities:</span>
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
                                                    background: noteType === t ? 'rgba(14, 116, 144,0.1)' : 'var(--bg-card)',
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
                                                        background: n.type === 'consultation' ? 'rgba(14, 116, 144,0.1)' : n.type === 'follow-up' ? 'rgba(79, 107, 138,0.1)' : 'rgba(128,128,128,0.1)',
                                                        color: n.type === 'consultation' ? '#0E7490' : n.type === 'follow-up' ? '#4F6B8A' : 'var(--text-muted)',
                                                    }}>{n.type}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.date).toLocaleString()}</span>
                                                </div>
                                                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }} 
                                                    dangerouslySetInnerHTML={{ __html: n.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} 
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* Journeys */}
                                    <div className="glass-card-static" style={{ padding: 20 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <MapIcon size={18} style={{ color: 'var(--color-primary)' }} /> Health Journeys
                                        </h3>
                                        {(!patientData.journeys || patientData.journeys.length === 0) ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No active health journeys</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {patientData.journeys.map((j: any) => (
                                                    <div key={j.id} style={{ padding: 16, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{j.title}</div>
                                                            <span style={{
                                                                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                                                background: j.status === 'active' ? 'rgba(5, 150, 105,0.1)' : 'rgba(100,116,139,0.1)',
                                                                color: j.status === 'active' ? '#059669' : '#64748B'
                                                            }}>{j.status}</span>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Condition: {j.condition}</div>
                                                        <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', background: 'var(--color-primary)', width: `${j.progress}%` }} />
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>{j.progress}% Completed</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Digital Twin Chat */}
                                    <div className="glass-card-static" style={{ padding: 20 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <MessageSquare size={18} style={{ color: '#4F6B8A' }} /> Recent AI Assistant Chats
                                        </h3>
                                        {(!patientData.chatHistory || patientData.chatHistory.length === 0) ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No chat history available</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                                                {patientData.chatHistory.slice(-10).map((msg: any) => (
                                                    <div key={msg.id} style={{
                                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                        background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-card)',
                                                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                                        border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                                                        padding: '10px 14px', borderRadius: 12, maxWidth: '85%', fontSize: 13, lineHeight: 1.5
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
