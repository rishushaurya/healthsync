'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
    FileText, Plus, Search, X, Check, ChevronDown, Send, Pill
} from 'lucide-react';
import {
    getCurrentDoctor, generateId, type DoctorAccount, type Prescription
} from '@/lib/store';
import { cloudGetDoctorAppointments, cloudGetDoctorPrescriptions, cloudAddPrescription, cloudAddNotification } from '@/lib/shared-store';

export default function PrescriptionsPage() {
    const searchParams = useSearchParams();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [patients, setPatients] = useState<{ userId: string; name: string }[]>([]);
    const [searchQ, setSearchQ] = useState('');

    // Form state
    const [selectedPatient, setSelectedPatient] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [medicines, setMedicines] = useState<{ name: string; dosage: string; frequency: string; duration: string; notes: string }[]>([
        { name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', notes: '' }
    ]);

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        (async () => {
            const [presc, apts] = await Promise.all([
                cloudGetDoctorPrescriptions(doc.id),
                cloudGetDoctorAppointments(doc.id),
            ]);
            setPrescriptions(presc);
            const pMap = new Map<string, string>();
            apts.forEach(a => pMap.set(a.userId, a.patientName));
            setPatients(Array.from(pMap.entries()).map(([userId, name]) => ({ userId, name })));
            const urlPatient = searchParams.get('patient');
            if (urlPatient) { setSelectedPatient(urlPatient); setShowCreate(true); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const addMedicine = () => setMedicines(prev => [...prev, { name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', notes: '' }]);
    const removeMedicine = (i: number) => setMedicines(prev => prev.filter((_, idx) => idx !== i));
    const updateMedicine = (i: number, field: string, value: string) => {
        setMedicines(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
    };

    const submitPrescription = async () => {
        if (!doctor || !selectedPatient || !diagnosis || medicines.some(m => !m.name)) return;
        const rx: Prescription = {
            id: generateId(), recipientUserId: selectedPatient, doctorId: doctor.id,
            doctorName: doctor.name, date: new Date().toISOString(), diagnosis,
            medicines: medicines.filter(m => m.name.trim()),
            advice, followUpDate: followUp || undefined, status: 'active',
        };
        await cloudAddPrescription(rx);
        await cloudAddNotification({
            id: generateId(), userId: selectedPatient, type: 'prescription',
            title: 'New Prescription', message: `${doctor.name} has sent you a prescription for ${diagnosis}`,
            timestamp: new Date().toISOString(), read: false, link: '/prescriptions',
        });
        const updated = await cloudGetDoctorPrescriptions(doctor.id);
        setPrescriptions(updated);
        setShowCreate(false);
        setDiagnosis(''); setAdvice(''); setFollowUp('');
        setMedicines([{ name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', notes: '' }]);
        setSelectedPatient('');
    };

    const filtered = prescriptions.filter(p => {
        const name = patients.find(pt => pt.userId === p.recipientUserId)?.name || '';
        return name.toLowerCase().includes(searchQ.toLowerCase()) || p.diagnosis.toLowerCase().includes(searchQ.toLowerCase());
    });

    if (!doctor) return null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Prescriptions</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{prescriptions.length} prescriptions issued</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                    <Plus size={16} /> New Prescription
                </button>
            </div>

            {/* Create Prescription Modal */}
            {showCreate && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Create Prescription</h2>
                        <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
                    </div>

                    {/* Patient Select */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Patient</label>
                        <select className="input-field" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
                            <option value="">Select patient...</option>
                            {patients.map(p => <option key={p.userId} value={p.userId}>{p.name}</option>)}
                        </select>
                    </div>

                    {/* Diagnosis */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Diagnosis</label>
                        <input className="input-field" placeholder="e.g., Upper respiratory infection" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                    </div>

                    {/* Medicines */}
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Medicines</label>
                    {medicines.map((med, i) => (
                        <div key={i} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: 10, background: 'var(--bg-card)' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input className="input-field" placeholder="Medicine name" value={med.name} onChange={e => updateMedicine(i, 'name', e.target.value)} style={{ flex: 2 }} />
                                <input className="input-field" placeholder="Dosage" value={med.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)} style={{ flex: 1 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select className="input-field" value={med.frequency} onChange={e => updateMedicine(i, 'frequency', e.target.value)} style={{ flex: 1 }}>
                                    <option>Once daily</option><option>Twice daily</option><option>Thrice daily</option><option>As needed</option><option>Before meals</option><option>After meals</option>
                                </select>
                                <input className="input-field" placeholder="Duration" value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)} style={{ flex: 1 }} />
                                {medicines.length > 1 && (
                                    <button onClick={() => removeMedicine(i)} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer' }}><X size={14} /></button>
                                )}
                            </div>
                        </div>
                    ))}
                    <button onClick={addMedicine} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--border-color)', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                        <Plus size={14} /> Add Medicine
                    </button>

                    {/* Advice */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Advice / Instructions</label>
                        <textarea className="input-field" placeholder="Diet, rest, precautions..." value={advice} onChange={e => setAdvice(e.target.value)} rows={2} />
                    </div>

                    {/* Follow-up */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Follow-up Date (Optional)</label>
                        <input className="input-field" type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} />
                    </div>

                    <button className="btn-primary" onClick={submitPrescription} disabled={!selectedPatient || !diagnosis || medicines.some(m => !m.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontSize: 14 }}>
                        <Send size={16} /> Send Prescription
                    </button>
                </motion.div>
            )}

            {/* Search */}
            {!showCreate && (
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input-field" placeholder="Search prescriptions..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ paddingLeft: 40 }} />
                </div>
            )}

            {/* List */}
            {!showCreate && (
                filtered.length === 0 ? (
                    <div className="glass-card-static" style={{ padding: 50, textAlign: 'center' }}>
                        <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-muted)' }}>No prescriptions yet</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.slice().reverse().map((rx, i) => {
                            const patientName = patients.find(p => p.userId === rx.recipientUserId)?.name || 'Unknown';
                            return (
                                <motion.div key={rx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                    className="glass-card" style={{ padding: 18 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{rx.diagnosis}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Patient: {patientName}</div>
                                        </div>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                            background: rx.status === 'active' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)',
                                            color: rx.status === 'active' ? '#0EA5E9' : '#10B981',
                                        }}>{rx.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                        {rx.medicines.map((m, j) => (
                                            <span key={j} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Pill size={10} /> {m.name} — {m.dosage} ({m.frequency})
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(rx.date).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </motion.div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}
