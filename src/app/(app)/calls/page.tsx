'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, Video, PhoneOff, PhoneIncoming, Mic, MicOff, Camera, CameraOff, Clock,
    Monitor, MonitorOff, PhoneCall, PhoneMissed
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser, generateId, getActiveJourney, getConsent, type CallLog, type PatientJourney } from '@/lib/store';
import { cloudGetCallLogs, cloudGetActiveCall, cloudUpdateCallLog, cloudAddNotification } from '@/lib/shared-store';
import { useLanguage } from '@/lib/LanguageProvider';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useLiveTranscript } from '@/hooks/useLiveTranscript';

export default function UserCallsPage() {
    const { t } = useLanguage();
    const webrtc = useWebRTC();
    const [userId, setUserId] = useState('');
    const [callHistory, setCallHistory] = useState<CallLog[]>([]);
    const [activeCall, setActiveCall] = useState<CallLog | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [isScreenShare, setIsScreenShare] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [justEnded, setJustEnded] = useState(false);
    const activeCallRef = useRef<CallLog | null>(null);
    const callDurationRef = useRef(0);
    const userIdRef = useRef('');

    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
    useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) return;
        setUserId(user.id);
        setJourney(getActiveJourney(user.id));
        cloudGetCallLogs(user.id, 'user').then(setCallHistory);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(async () => {
            const call = await cloudGetActiveCall();
            if (call && call.userId === userId && (call.status === 'ringing' || call.status === 'ongoing')) {
                setActiveCall(call);
            } else if (activeCallRef.current && call === null) {
                setActiveCall(null);
                setJustEnded(true);
                setCallDuration(0);
                const history = await cloudGetCallLogs(userId, 'user');
                setCallHistory(history);
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        if (!activeCall || activeCall.status !== 'ongoing' || !webrtc.isConnected) return;
        const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [activeCall?.status, webrtc.isConnected]);

    const acceptCall = async () => {
        if (!activeCall) return;
        await cloudUpdateCallLog(activeCall.id, { status: 'ongoing' });
        setActiveCall(prev => prev ? { ...prev, status: 'ongoing' } : null);
        setCallDuration(0);
        // Start WebRTC as callee — create SDP answer from doctor's offer
        try {
            await webrtc.startAsCalleeAsync(activeCall.id, activeCall.type || 'audio');
        } catch (e) {
            console.error('WebRTC callee setup failed:', e);
        }
        await cloudAddNotification({
            id: generateId(), userId, type: 'call',
            title: `${activeCall.type === 'video' ? 'Video' : 'Audio'} Call Started`,
            message: `Connected with ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(), read: false,
        });
    };

    const rejectCall = async () => {
        if (!activeCall) return;
        webrtc.stopCall();
        await cloudUpdateCallLog(activeCall.id, { status: 'missed', endTime: new Date().toISOString() });
        await cloudAddNotification({
            id: generateId(), userId, type: 'call',
            title: 'Missed Call',
            message: `Missed call from ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(), read: false,
        });
        setActiveCall(null);
        const history = await cloudGetCallLogs(userId, 'user');
        setCallHistory(history);
    };

    const endCall = async () => {
        const call = activeCallRef.current;
        if (!call) return;
        webrtc.stopCall();
        await cloudUpdateCallLog(call.id, { status: 'completed', endTime: new Date().toISOString(), duration: callDurationRef.current });
        await cloudAddNotification({
            id: generateId(), userId: userIdRef.current, type: 'call',
            title: 'Call Ended',
            message: `Call with ${call.doctorName} ended. Duration: ${formatDuration(callDurationRef.current)}`,
            timestamp: new Date().toISOString(), read: false,
        });
        setActiveCall(null);
        setJustEnded(true);
        setCallDuration(0);
        setIsScreenShare(false);
        const history = await cloudGetCallLogs(userIdRef.current, 'user');
        setCallHistory(history);
    };

    // Journey consultation with this doctor: transcribe the patient's side once both have consented
    const journeyCall = !!journey && !!activeCall && journey.doctorId === activeCall.doctorId;
    const consent = journey ? getConsent(journey.id) : { patient: false, doctor: false };
    const transcript = useLiveTranscript(journey?.id ?? null, 'patient', journeyCall && activeCall?.status === 'ongoing' && consent.patient && consent.doctor);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60); const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const totalCalls = callHistory.length;
    const completedCalls = callHistory.filter(c => c.status === 'completed').length;
    const missedCalls = callHistory.filter(c => c.status === 'missed').length;
    const totalDuration = callHistory.reduce((sum, c) => sum + (c.duration || 0), 0);

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{t('calls.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>{t('calls.subtitle')}</p>

            {justEnded && journey?.doctorId && (
                <div className="card" role="status" style={{ padding: 18, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderColor: 'var(--color-primary)' }}>
                    <span style={{ flex: 1, minWidth: 220 }}><strong>Consultation finished.</strong> Your doctor is preparing your care plan.</span>
                    <Link href="/journey/care-plan" className="btn-primary">See care plan status</Link>
                </div>
            )}

            {totalCalls > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Total Calls', value: totalCalls, icon: PhoneCall, color: '#0E7490' },
                        { label: 'Completed', value: completedCalls, icon: Phone, color: '#059669' },
                        { label: 'Missed', value: missedCalls, icon: PhoneMissed, color: '#DC2626' },
                        { label: 'Talk Time', value: formatDuration(totalDuration), icon: Clock, color: '#4F6B8A' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card-static" style={{ padding: 16, textAlign: 'center' }}>
                            <stat.icon size={20} style={{ color: stat.color, marginBottom: 8 }} />
                            <div style={{ fontWeight: 800, fontSize: 20 }}>{stat.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {activeCall && activeCall.status === 'ringing' && (
                    <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
                            padding: 16, display: 'flex', justifyContent: 'center',
                        }}>
                        <div style={{
                            width: '100%', maxWidth: 420, padding: '20px 24px', borderRadius: 20,
                            background: '#0B1120f5',
                            backdropFilter: 'blur(24px)', border: '1px solid rgba(14, 116, 144,0.4)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(14, 116, 144,0.15)',
                            display: 'flex', alignItems: 'center', gap: 16,
                        }}>
                            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                style={{
                                    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                                    background: activeCall.type === 'video'
                                        ? '#4F6B8A'
                                        : '#059669',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                <PhoneIncoming size={24} style={{ color: 'white' }} />
                            </motion.div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activeCall.doctorName}
                                </div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                                    Incoming {activeCall.type === 'video' ? 'Video' : 'Audio'} Call
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                                <button onClick={rejectCall} style={{
                                    width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                    background: '#DC2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(220, 38, 38,0.4)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                                }}><PhoneOff size={20} /></button>
                                <button onClick={acceptCall} style={{
                                    width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                    background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105,0.4)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                                }}><Phone size={20} /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeCall && activeCall.status === 'ongoing' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: activeCall.type === 'video' ? '#0B1120' : '#0B1120',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
                        }}>
                        {/* Remote Video (full screen background) */}
                        {activeCall.type === 'video' && webrtc.remoteStream && (
                            <video
                                ref={el => { if (el && el.srcObject !== webrtc.remoteStream) el.srcObject = webrtc.remoteStream; }}
                                autoPlay playsInline
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )}
                        {/* Local Video (small pip) */}
                        {activeCall.type === 'video' && webrtc.localStream && (
                            <video
                                ref={el => { if (el && el.srcObject !== webrtc.localStream) el.srcObject = webrtc.localStream; }}
                                autoPlay playsInline muted
                                style={{
                                    position: 'absolute', bottom: 100, right: 20, width: 120, height: 160,
                                    borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)',
                                    zIndex: 10, background: '#000',
                                }}
                            />
                        )}
                        {activeCall.type === 'video' && !webrtc.remoteStream && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                                <Video size={200} />
                            </div>
                        )}
                        {isScreenShare && (
                            <div style={{
                                position: 'absolute', top: 20, left: 20, padding: '8px 16px', borderRadius: 10,
                                background: 'rgba(5, 150, 105,0.2)', border: '1px solid rgba(5, 150, 105,0.3)',
                                color: '#059669', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            }}><Monitor size={14} /> Screen Sharing Active</div>
                        )}
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%', background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white', fontWeight: 700,
                        }}>
                            {activeCall.doctorName.split(' ').pop()?.charAt(0) || 'D'}
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{activeCall.doctorName}</h2>
                        {transcript.listening && (
                            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(220, 38, 38, 0.2)', color: '#FCA5A5', fontSize: 13, fontWeight: 600 }}>
                                <Mic size={14} /> Recording with consent for your care plan
                            </div>
                        )}
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{formatDuration(callDuration)}</p>
                        {/* Permission error */}
                        {webrtc.permissionError && (
                            <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(220, 38, 38,0.2)', border: '1px solid rgba(220, 38, 38,0.3)', color: '#FCA5A5', fontSize: 12, maxWidth: 300, textAlign: 'center' }}>
                                {webrtc.permissionError}
                            </div>
                        )}
                        {/* Connection status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: webrtc.isConnected ? '#059669' : '#D97706' }} />
                            <span style={{ color: webrtc.isConnected ? '#059669' : '#D97706', fontSize: 11, fontWeight: 600 }}>
                                {webrtc.isConnected ? 'Voice Connected' : 'Connecting...'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 20, position: 'relative', zIndex: 10000 }}>
                            <button onClick={() => { const newVal = !isMuted; setIsMuted(newVal); webrtc.toggleMute(newVal); }} style={{
                                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: isMuted ? 'rgba(220, 38, 38,0.2)' : 'rgba(255,255,255,0.1)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                            {activeCall.type === 'video' && (
                                <>
                                    <button onClick={() => { const newVal = !isCamOff; setIsCamOff(newVal); webrtc.toggleCamera(newVal); }} style={{
                                        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                        background: isCamOff ? 'rgba(220, 38, 38,0.2)' : 'rgba(255,255,255,0.1)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isCamOff ? <CameraOff size={22} /> : <Camera size={22} />}
                                    </button>
                                    <button onClick={() => setIsScreenShare(!isScreenShare)} style={{
                                        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                        background: isScreenShare ? 'rgba(5, 150, 105,0.3)' : 'rgba(255,255,255,0.1)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isScreenShare ? <MonitorOff size={22} /> : <Monitor size={22} />}
                                    </button>
                                </>
                            )}
                            <button onClick={endCall} style={{
                                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: '#DC2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <PhoneOff size={22} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {callHistory.length === 0 ? (
                <div className="glass-card-static" style={{ padding: 60, textAlign: 'center' }}>
                    <Phone size={48} style={{ color: 'var(--text-muted)', marginBottom: 14, opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{t('calls.noHistory')}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>When your doctor calls you, it will appear here.</p>
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
                                        background: c.type === 'video' ? 'rgba(79, 107, 138,0.1)' : 'rgba(14, 116, 144,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {c.type === 'video' ? <Video size={18} style={{ color: '#4F6B8A' }} /> : <Phone size={18} style={{ color: '#0E7490' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.doctorName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={10} /> {new Date(c.startTime).toLocaleString()} {c.duration ? `• ${formatDuration(c.duration)}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                    background: c.status === 'completed' ? 'rgba(5, 150, 105,0.1)' : 'rgba(220, 38, 38,0.1)',
                                    color: c.status === 'completed' ? '#059669' : '#DC2626',
                                }}>{c.status}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
