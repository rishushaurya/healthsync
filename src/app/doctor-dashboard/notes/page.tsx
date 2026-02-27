'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Search, User } from 'lucide-react';
import {
    getCurrentDoctor, getDoctorNotes,
    addDoctorNote, generateId, type DoctorAccount, type DoctorNote
} from '@/lib/store';
import { cloudGetDoctorAppointments } from '@/lib/shared-store';

export default function NotesPage() {
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [notes, setNotes] = useState<DoctorNote[]>([]);
    const [patients, setPatients] = useState<{ userId: string; name: string }[]>([]);
    const [searchQ, setSearchQ] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState<'consultation' | 'follow-up' | 'general'>('consultation');

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        setNotes(getDoctorNotes(doc.id));
        cloudGetDoctorAppointments(doc.id).then(apts => {
            const pMap = new Map<string, string>();
            apts.forEach(a => pMap.set(a.userId, a.patientName));
            setPatients(Array.from(pMap.entries()).map(([userId, name]) => ({ userId, name })));
        });
    }, []);

    const createNote = () => {
        if (!doctor || !selectedPatient || !noteText.trim()) return;
        const name = patients.find(p => p.userId === selectedPatient)?.name || '';
        addDoctorNote({
            id: generateId(), doctorId: doctor.id, patientId: selectedPatient,
            patientName: name, date: new Date().toISOString(), content: noteText.trim(), type: noteType,
        });
        setNotes(getDoctorNotes(doctor.id));
        setNoteText(''); setShowAdd(false);
    };

    const filtered = notes.filter(n =>
        n.patientName.toLowerCase().includes(searchQ.toLowerCase()) || n.content.toLowerCase().includes(searchQ.toLowerCase())
    );

    const grouped = filtered.reduce((acc, n) => {
        if (!acc[n.patientId]) acc[n.patientId] = { name: n.patientName, notes: [] };
        acc[n.patientId].notes.push(n);
        return acc;
    }, {} as Record<string, { name: string; notes: DoctorNote[] }>);

    if (!doctor) return null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Clinical Notes</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{notes.length} notes across {Object.keys(grouped).length} patients</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                    <Plus size={16} /> Add Note
                </button>
            </div>

            {showAdd && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 22, marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 14 }}>New Clinical Note</h3>
                    <select className="input-field" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} style={{ marginBottom: 10 }}>
                        <option value="">Select patient...</option>
                        {patients.map(p => <option key={p.userId} value={p.userId}>{p.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {(['consultation', 'follow-up', 'general'] as const).map(t => (
                            <button key={t} onClick={() => setNoteType(t)} style={{
                                padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
                                background: noteType === t ? 'rgba(14,165,233,0.1)' : 'var(--bg-card)',
                                color: noteType === t ? 'var(--color-primary)' : 'var(--text-muted)',
                                border: '1px solid var(--border-color)', fontWeight: noteType === t ? 600 : 400,
                            }}>{t}</button>
                        ))}
                    </div>
                    <textarea className="input-field" placeholder="Write your clinical note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} style={{ marginBottom: 12, resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary" onClick={createNote} disabled={!selectedPatient || !noteText.trim()} style={{ padding: '8px 20px', fontSize: 13 }}>Save Note</button>
                        <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
                    </div>
                </motion.div>
            )}

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input-field" placeholder="Search notes..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ paddingLeft: 40 }} />
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="glass-card-static" style={{ padding: 50, textAlign: 'center' }}>
                    <ClipboardList size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No clinical notes yet</p>
                </div>
            ) : (
                Object.entries(grouped).map(([patientId, data]) => (
                    <div key={patientId} style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                                {data.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{data.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({data.notes.length} notes)</span>
                        </div>
                        {data.notes.slice().reverse().map((n, i) => (
                            <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="glass-card" style={{ padding: 14, marginBottom: 8, marginLeft: 36 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                                        background: n.type === 'consultation' ? 'rgba(14,165,233,0.1)' : n.type === 'follow-up' ? 'rgba(139,92,246,0.1)' : 'rgba(128,128,128,0.1)',
                                        color: n.type === 'consultation' ? '#0EA5E9' : n.type === 'follow-up' ? '#8B5CF6' : 'var(--text-muted)',
                                    }}>{n.type}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.date).toLocaleString()}</span>
                                </div>
                                <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                            </motion.div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
