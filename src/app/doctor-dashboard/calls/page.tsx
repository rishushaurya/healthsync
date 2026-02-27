'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
    Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff,
    Clock, User, Search
} from 'lucide-react';
import {
    getCurrentDoctor, getDoctorAppointments, getCallLogs,
    addCallLog, updateCallLog, generateId, type DoctorAccount, type CallLog
} from '@/lib/store';

export default function CallsPage() {
    const searchParams = useSearchParams();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [callHistory, setCallHistory] = useState<CallLog[]>([]);
    const [patients, setPatients] = useState<{ userId: string; name: string }[]>([]);
    const [activeCall, setActiveCall] = useState<CallLog | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [showDialer, setShowDialer] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState('');
    // Use refs to avoid stale closures
    const activeCallRef = useRef<CallLog | null>(null);
    const callDurationRef = useRef(0);
    const doctorRef = useRef<DoctorAccount | null>(null);

    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
    useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);
    useEffect(() => { doctorRef.current = doctor; }, [doctor]);

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        setCallHistory(getCallLogs(doc.id, 'doctor'));
        const apts = getDoctorAppointments(doc.id);
        const pMap = new Map<string, string>();
        apts.forEach(a => pMap.set(a.userId, a.patientName));
        setPatients(Array.from(pMap.entries()).map(([userId, name]) => ({ userId, name })));
        const urlP = searchParams.get('patient');
        if (urlP) { setSelectedPatient(urlP); setShowDialer(true); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Call timer
    useEffect(() => {
        if (!activeCall || activeCall.status !== 'ongoing') return;
        const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [activeCall?.status]);

    const startCall = (type: 'audio' | 'video') => {
        if (!doctor || !selectedPatient) return;
        const patientName = patients.find(p => p.userId === selectedPatient)?.name || 'Patient';
        const call: CallLog = {
            id: generateId(), doctorId: doctor.id, doctorName: doctor.name,
            userId: selectedPatient, userName: patientName,
            type, status: 'ringing', startTime: new Date().toISOString(),
        };
        addCallLog(call);
        setActiveCall(call);
        setCallType(type);
        setCallDuration(0);
        // Simulate patient picking up after 2.5 seconds
        setTimeout(() => {
            updateCallLog(call.id, { status: 'ongoing' });
            setActiveCall(prev => prev?.id === call.id ? { ...prev, status: 'ongoing' } : prev);
        }, 2500);
    };

    const endCall = () => {
        const call = activeCallRef.current;
        if (!call) return;
        updateCallLog(call.id, {
            status: 'completed', endTime: new Date().toISOString(), duration: callDurationRef.current,
        });
        setActiveCall(null);
        setCallDuration(0);
        setShowDialer(false);
        if (doctorRef.current) setCallHistory(getCallLogs(doctorRef.current.id, 'doctor'));
    };

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60); const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!doctor) return null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Calls</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Audio and video consultations</p>
                </div>
                {!activeCall && (
                    <button className="btn-primary" onClick={() => setShowDialer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                        <Phone size={16} /> New Call
                    </button>
                )}
            </div>

            {/* Active Call Screen */}
            <AnimatePresence>
                {activeCall && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: callType === 'video' ? 'linear-gradient(135deg, #0B1120, #1a0b2e)' : 'linear-gradient(135deg, #0B1120, #0c2035)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
                        }}>
                        {callType === 'video' && activeCall.status === 'ongoing' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                                <Video size={200} />
                            </div>
                        )}
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%', background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white', fontWeight: 700,
                        }}>
                            {activeCall.userName.charAt(0)}
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{activeCall.userName}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                            {activeCall.status === 'ringing' ? 'Calling...' : formatDuration(callDuration)}
                        </p>
                        {activeCall.status === 'ringing' && (
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                style={{ width: 14, height: 14, borderRadius: '50%', background: '#10B981' }} />
                        )}
                        <div style={{ display: 'flex', gap: 16, marginTop: 20, position: 'relative', zIndex: 10000 }}>
                            <button onClick={() => setIsMuted(!isMuted)} style={{
                                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                            {callType === 'video' && (
                                <button onClick={() => setIsCamOff(!isCamOff)} style={{
                                    width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                    background: isCamOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {isCamOff ? <CameraOff size={22} /> : <Camera size={22} />}
                                </button>
                            )}
                            <button onClick={endCall} style={{
                                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <PhoneOff size={22} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dialer */}
            {showDialer && !activeCall && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Start a Call</h2>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Select Patient</label>
                        <select className="input-field" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
                            <option value="">Choose patient...</option>
                            {patients.map(p => <option key={p.userId} value={p.userId}>{p.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-primary" onClick={() => startCall('audio')} disabled={!selectedPatient}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', flex: 1, justifyContent: 'center' }}>
                            <Phone size={18} /> Audio Call
                        </button>
                        <button className="btn-primary" onClick={() => startCall('video')} disabled={!selectedPatient}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                            <Video size={18} /> Video Call
                        </button>
                    </div>
                    <button onClick={() => setShowDialer(false)} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                </motion.div>
            )}

            {/* Call History */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Call History</h2>
            {callHistory.length === 0 ? (
                <div className="glass-card-static" style={{ padding: 50, textAlign: 'center' }}>
                    <Phone size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No call history</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {callHistory.slice().reverse().map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: c.type === 'video' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {c.type === 'video' ? <Video size={18} style={{ color: '#8B5CF6' }} /> : <Phone size={18} style={{ color: '#0EA5E9' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.userName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={10} /> {new Date(c.startTime).toLocaleString()} • {c.duration ? formatDuration(c.duration) : '—'}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                    background: c.status === 'completed' ? 'rgba(16,185,129,0.1)' : c.status === 'missed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: c.status === 'completed' ? '#10B981' : c.status === 'missed' ? '#EF4444' : '#F59E0B',
                                }}>{c.status}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
