'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
    Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff,
    Clock, User, Search, Brain, FileText, Send, Loader2, Check, X, Pill
} from 'lucide-react';
import {
    getCurrentDoctor, generateId,
    type DoctorAccount, type CallLog
} from '@/lib/store';
import {
    cloudGetDoctorAppointments, cloudGetCallLogs, cloudAddCallLog,
    cloudUpdateCallLog, cloudGetActiveCall, cloudAddPrescription,
    cloudAddNotification, cloudGetPatientData, cloudGetAllUsers
} from '@/lib/shared-store';
import { useWebRTC } from '@/hooks/useWebRTC';

export default function CallsPage() {
    const searchParams = useSearchParams();
    const webrtc = useWebRTC();
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

    // AI Prescription states
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [lastEndedCall, setLastEndedCall] = useState<CallLog | null>(null);
    const [consultationNotes, setConsultationNotes] = useState('');
    const [generatingPrescription, setGeneratingPrescription] = useState(false);
    const [generatedPrescription, setGeneratedPrescription] = useState<{
        diagnosis: string;
        medicines: { name: string; dosage: string; frequency: string; duration: string; notes: string }[];
        advice: string;
        followUpDays: number;
    } | null>(null);
    const [prescriptionSent, setPrescriptionSent] = useState(false);
    const [lastCallDuration, setLastCallDuration] = useState(0);

    // Refs to avoid stale closures
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
        // Load from cloud
        (async () => {
            const [history, apts] = await Promise.all([
                cloudGetCallLogs(doc.id, 'doctor'),
                cloudGetDoctorAppointments(doc.id),
            ]);
            setCallHistory(history);
            const pMap = new Map<string, string>();
            apts.forEach(a => pMap.set(a.userId, a.patientName));
            setPatients(Array.from(pMap.entries()).map(([userId, name]) => ({ userId, name })));
            const urlP = searchParams.get('patient');
            if (urlP) { setSelectedPatient(urlP); setShowDialer(true); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Poll for call status changes from cloud (e.g., user accepting or rejecting)
    useEffect(() => {
        if (!activeCall) return;
        const interval = setInterval(async () => {
            const call = activeCallRef.current;
            if (!call) return;
            // Re-read the call status from cloud
            const updatedCall = await cloudGetActiveCall();
            if (updatedCall && updatedCall.id === call.id) {
                if (updatedCall.status !== call.status) {
                    if (updatedCall.status === 'ongoing') {
                        setActiveCall({ ...updatedCall });
                    } else if (updatedCall.status === 'missed' || updatedCall.status === 'completed') {
                        webrtc.stopCall();
                        setLastEndedCall(call);
                        setLastCallDuration(callDurationRef.current);
                        setActiveCall(null);
                        setCallDuration(0);
                        setShowDialer(false);
                        if (doctorRef.current) {
                            const h = await cloudGetCallLogs(doctorRef.current.id, 'doctor');
                            setCallHistory(h);
                        }
                        if (updatedCall.status !== 'missed') {
                            setShowPrescriptionModal(true);
                        }
                    }
                }
            } else if (!updatedCall && call.status === 'ringing') {
                // User may have rejected (status changed to missed, no longer active)
                webrtc.stopCall();
                setLastEndedCall(call);
                setActiveCall(null);
                setCallDuration(0);
                setShowDialer(false);
                if (doctorRef.current) {
                    const h = await cloudGetCallLogs(doctorRef.current.id, 'doctor');
                    setCallHistory(h);
                }
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [activeCall?.id]);

    // Call timer
    useEffect(() => {
        if (!activeCall || activeCall.status !== 'ongoing') return;
        const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [activeCall?.status]);

    const startCall = async (type: 'audio' | 'video') => {
        if (!doctor || !selectedPatient) return;
        const patientName = patients.find(p => p.userId === selectedPatient)?.name || 'Patient';
        const call: CallLog = {
            id: generateId(), doctorId: doctor.id, doctorName: doctor.name,
            userId: selectedPatient, userName: patientName,
            type, status: 'ringing', startTime: new Date().toISOString(),
        };
        await cloudAddCallLog(call);
        setActiveCall(call);
        setCallType(type);
        setCallDuration(0);
        // Start WebRTC as the caller — create SDP offer and wait for callee answer
        try {
            await webrtc.startAsCallerAsync(call.id);
        } catch (e) {
            console.error('WebRTC caller setup failed:', e);
        }
    };

    const endCall = async () => {
        const call = activeCallRef.current;
        if (!call) return;
        const duration = callDurationRef.current;
        // Stop WebRTC connection
        webrtc.stopCall();
        await cloudUpdateCallLog(call.id, {
            status: 'completed', endTime: new Date().toISOString(), duration,
        });
        setLastEndedCall(call);
        setLastCallDuration(duration);
        setActiveCall(null);
        setCallDuration(0);
        setShowDialer(false);
        if (doctorRef.current) {
            const h = await cloudGetCallLogs(doctorRef.current.id, 'doctor');
            setCallHistory(h);
        }
        if (duration > 0) {
            setShowPrescriptionModal(true);
        }
    };

    const generateAIPrescription = async () => {
        if (!doctor || !lastEndedCall) return;
        setGeneratingPrescription(true);

        // Get patient data for context from cloud
        const patientData = await cloudGetPatientData(lastEndedCall.userId, doctor.id);
        const allUsers = await cloudGetAllUsers();
        const patient = allUsers.find(u => u.id === lastEndedCall.userId);

        try {
            const response = await fetch('/api/ai/prescription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctorName: doctor.name,
                    doctorSpecialty: doctor.specialty,
                    patientName: lastEndedCall.userName,
                    patientAge: patient?.age || '',
                    patientGender: patient?.gender || '',
                    patientConditions: patient?.existingConditions || [],
                    callDuration: Math.max(1, Math.floor(lastCallDuration / 60)),
                    consultationNotes: consultationNotes,
                    language: patient?.language || 'English',
                }),
            });
            const data = await response.json();
            if (data.prescription) {
                setGeneratedPrescription(data.prescription);
            }
        } catch (error) {
            console.error('Failed to generate prescription:', error);
        }
        setGeneratingPrescription(false);
    };

    const sendPrescription = async () => {
        if (!doctor || !lastEndedCall || !generatedPrescription) return;

        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + (generatedPrescription.followUpDays || 7));

        await cloudAddPrescription({
            id: generateId(),
            recipientUserId: lastEndedCall.userId,
            doctorId: doctor.id,
            doctorName: doctor.name,
            date: new Date().toISOString(),
            diagnosis: generatedPrescription.diagnosis,
            medicines: generatedPrescription.medicines,
            advice: generatedPrescription.advice,
            followUpDate: followUpDate.toISOString().split('T')[0],
            status: 'active',
        });

        // Send notification to the patient in cloud
        await cloudAddNotification({
            id: generateId(),
            userId: lastEndedCall.userId,
            type: 'prescription',
            title: 'New Prescription',
            message: `${doctor.name} has sent you a prescription after your consultation.`,
            timestamp: new Date().toISOString(),
            read: false,
            link: '/prescriptions',
        });

        setPrescriptionSent(true);
        setTimeout(() => {
            setShowPrescriptionModal(false);
            setPrescriptionSent(false);
            setGeneratedPrescription(null);
            setConsultationNotes('');
            setLastEndedCall(null);
        }, 2000);
    };

    const closePrescriptionModal = () => {
        setShowPrescriptionModal(false);
        setGeneratedPrescription(null);
        setConsultationNotes('');
        setPrescriptionSent(false);
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
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Audio and video consultations with AI-assisted prescriptions</p>
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

                        {/* AI Recording Indicator */}
                        {activeCall.status === 'ongoing' && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'absolute', top: 20, left: 20,
                                    padding: '10px 18px', borderRadius: 12,
                                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                <motion.div
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}
                                />
                                <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}>REC</span>
                                <Brain size={14} style={{ color: '#8B5CF6', marginLeft: 4 }} />
                                <span style={{ color: '#8B5CF6', fontSize: 12, fontWeight: 600 }}>AI Listening</span>
                            </motion.div>
                        )}

                        <div style={{
                            width: 100, height: 100, borderRadius: '50%', background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white', fontWeight: 700,
                        }}>
                            {activeCall.userName.charAt(0)}
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{activeCall.userName}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                            {activeCall.status === 'ringing' ? 'Ringing... waiting for patient to accept' : formatDuration(callDuration)}
                        </p>
                        {activeCall.status === 'ringing' && (
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                style={{ width: 14, height: 14, borderRadius: '50%', background: '#10B981' }} />
                        )}
                        {activeCall.status === 'ongoing' && (
                            <div style={{
                                padding: '6px 14px', borderRadius: 8,
                                background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: '#A78BFA', fontSize: 11, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <Brain size={12} /> AI will generate prescription after call
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 16, marginTop: 20, position: 'relative', zIndex: 10000 }}>
                            <button onClick={() => { const newVal = !isMuted; setIsMuted(newVal); webrtc.toggleMute(newVal); }} style={{
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

            {/* AI Prescription Modal */}
            <AnimatePresence>
                {showPrescriptionModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10001, padding: 20, backdropFilter: 'blur(6px)',
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card-static"
                            style={{ padding: 28, width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }}
                        >
                            {prescriptionSent ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Check size={56} style={{ color: '#10B981', marginBottom: 16 }} />
                                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Prescription Sent!</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        The prescription has been sent to {lastEndedCall?.userName}
                                    </p>
                                </div>
                            ) : !generatedPrescription ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Brain size={22} style={{ color: '#8B5CF6' }} />
                                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>AI Prescription Generator</h2>
                                        </div>
                                        <button onClick={closePrescriptionModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                                        Call with <strong>{lastEndedCall?.userName}</strong> ended ({formatDuration(lastCallDuration)}).
                                        AI listened to the consultation and can generate a complete prescription.
                                    </p>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                            Consultation Notes (optional — helps AI generate better prescription)
                                        </label>
                                        <textarea
                                            className="input-field"
                                            rows={4}
                                            placeholder="e.g. Patient complained of persistent headache for 3 days, mild fever, no nausea. Suggested migraine medication..."
                                            value={consultationNotes}
                                            onChange={e => setConsultationNotes(e.target.value)}
                                            style={{ resize: 'vertical', width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={closePrescriptionModal} style={{
                                            flex: 1, padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border-color)',
                                            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14,
                                        }}>
                                            Skip
                                        </button>
                                        <button onClick={generateAIPrescription} disabled={generatingPrescription} className="btn-primary" style={{
                                            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px',
                                        }}>
                                            {generatingPrescription ? (
                                                <><Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                                            ) : (
                                                <><Brain size={16} /> Generate AI Prescription</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <FileText size={22} style={{ color: '#10B981' }} />
                                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Review Prescription</h2>
                                        </div>
                                        <button onClick={closePrescriptionModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                                    </div>

                                    {/* Diagnosis */}
                                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.15)', marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0EA5E9', marginBottom: 4, textTransform: 'uppercase' }}>Diagnosis</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{generatedPrescription.diagnosis}</div>
                                    </div>

                                    {/* Medicines */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Pill size={14} style={{ color: '#8B5CF6' }} /> Medicines
                                        </div>
                                        {generatedPrescription.medicines.map((med, i) => (
                                            <div key={i} style={{
                                                padding: 12, borderRadius: 10, border: '1px solid var(--border-color)',
                                                marginBottom: 8, background: 'var(--bg-card)',
                                            }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{med.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                    <span>💊 {med.dosage}</span>
                                                    <span>🕐 {med.frequency}</span>
                                                    <span>📅 {med.duration}</span>
                                                </div>
                                                {med.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>📝 {med.notes}</div>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Advice / Diet / Recovery */}
                                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#10B981', marginBottom: 6, textTransform: 'uppercase' }}>Advice, Diet & Recovery Plan</div>
                                        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{generatedPrescription.advice}</div>
                                    </div>

                                    {/* Follow Up */}
                                    <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', marginBottom: 20 }}>
                                        <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                                            📅 Follow-up in {generatedPrescription.followUpDays} days
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={() => setGeneratedPrescription(null)} style={{
                                            flex: 1, padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border-color)',
                                            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14,
                                        }}>
                                            Regenerate
                                        </button>
                                        <button onClick={sendPrescription} className="btn-primary" style={{
                                            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px',
                                        }}>
                                            <Send size={16} /> Send to {lastEndedCall?.userName}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
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
                    <div style={{
                        padding: 12, borderRadius: 10, background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)',
                        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#A78BFA',
                    }}>
                        <Brain size={14} /> AI will listen and auto-generate prescription after the call
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

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
