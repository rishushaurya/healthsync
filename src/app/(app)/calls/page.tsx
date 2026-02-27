'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, Video, PhoneOff, PhoneIncoming, Mic, MicOff, Camera, CameraOff, Clock,
    Monitor, MonitorOff, PhoneCall, PhoneMissed
} from 'lucide-react';
import { getCurrentUser, getCallLogs, getActiveCall, updateCallLog, addNotification, generateId, type CallLog } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';

export default function UserCallsPage() {
    const { t } = useLanguage();
    const [userId, setUserId] = useState('');
    const [callHistory, setCallHistory] = useState<CallLog[]>([]);
    const [activeCall, setActiveCall] = useState<CallLog | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [isScreenShare, setIsScreenShare] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
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
        setCallHistory(getCallLogs(user.id, 'user'));
    }, []);

    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(() => {
            const call = getActiveCall();
            if (call && call.userId === userId && (call.status === 'ringing' || call.status === 'ongoing')) {
                setActiveCall(call);
            } else if (activeCallRef.current && call === null) {
                setActiveCall(null);
                setCallDuration(0);
                setCallHistory(getCallLogs(userId, 'user'));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        if (!activeCall || activeCall.status !== 'ongoing') return;
        const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [activeCall?.status]);

    const acceptCall = () => {
        if (!activeCall) return;
        updateCallLog(activeCall.id, { status: 'ongoing' });
        setActiveCall(prev => prev ? { ...prev, status: 'ongoing' } : null);
        setCallDuration(0);
        addNotification({
            id: generateId(), userId, type: 'call',
            title: `${activeCall.type === 'video' ? 'Video' : 'Audio'} Call Started`,
            message: `Connected with ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(), read: false,
        });
    };

    const rejectCall = () => {
        if (!activeCall) return;
        updateCallLog(activeCall.id, { status: 'missed', endTime: new Date().toISOString() });
        addNotification({
            id: generateId(), userId, type: 'call',
            title: 'Missed Call',
            message: `Missed call from ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(), read: false,
        });
        setActiveCall(null);
        setCallHistory(getCallLogs(userId, 'user'));
    };

    const endCall = () => {
        const call = activeCallRef.current;
        if (!call) return;
        updateCallLog(call.id, { status: 'completed', endTime: new Date().toISOString(), duration: callDurationRef.current });
        addNotification({
            id: generateId(), userId: userIdRef.current, type: 'call',
            title: 'Call Ended',
            message: `Call with ${call.doctorName} ended. Duration: ${formatDuration(callDurationRef.current)}`,
            timestamp: new Date().toISOString(), read: false,
        });
        setActiveCall(null);
        setCallDuration(0);
        setIsScreenShare(false);
        setCallHistory(getCallLogs(userIdRef.current, 'user'));
    };

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

            {totalCalls > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Total Calls', value: totalCalls, icon: PhoneCall, color: '#0EA5E9' },
                        { label: 'Completed', value: completedCalls, icon: Phone, color: '#10B981' },
                        { label: 'Missed', value: missedCalls, icon: PhoneMissed, color: '#EF4444' },
                        { label: 'Talk Time', value: formatDuration(totalDuration), icon: Clock, color: '#8B5CF6' },
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
                    <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        style={{
                            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
                            padding: '24px 32px', borderRadius: 20, background: 'linear-gradient(135deg, #0B1120ee, #1a0b2eee)',
                            backdropFilter: 'blur(20px)', border: '1px solid rgba(14,165,233,0.3)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 320,
                        }}>
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <PhoneIncoming size={36} style={{ color: '#10B981' }} />
                        </motion.div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Incoming {activeCall.type === 'video' ? 'Video' : 'Audio'} Call</div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{activeCall.doctorName}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 10000 }}>
                            <button onClick={rejectCall} style={{
                                width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}><PhoneOff size={22} /></button>
                            <button onClick={acceptCall} style={{
                                width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}><Phone size={22} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeCall && activeCall.status === 'ongoing' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: activeCall.type === 'video' ? 'linear-gradient(135deg, #0B1120, #1a0b2e)' : 'linear-gradient(135deg, #0B1120, #0c2035)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
                        }}>
                        {activeCall.type === 'video' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                                <Video size={200} />
                            </div>
                        )}
                        {isScreenShare && (
                            <div style={{
                                position: 'absolute', top: 20, left: 20, padding: '8px 16px', borderRadius: 10,
                                background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)',
                                color: '#10B981', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            }}><Monitor size={14} /> Screen Sharing Active</div>
                        )}
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%', background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white', fontWeight: 700,
                        }}>
                            {activeCall.doctorName.split(' ').pop()?.charAt(0) || 'D'}
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{activeCall.doctorName}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{formatDuration(callDuration)}</p>
                        <div style={{ display: 'flex', gap: 16, marginTop: 20, position: 'relative', zIndex: 10000 }}>
                            <button onClick={() => setIsMuted(!isMuted)} style={{
                                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                            {activeCall.type === 'video' && (
                                <>
                                    <button onClick={() => setIsCamOff(!isCamOff)} style={{
                                        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                        background: isCamOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isCamOff ? <CameraOff size={22} /> : <Camera size={22} />}
                                    </button>
                                    <button onClick={() => setIsScreenShare(!isScreenShare)} style={{
                                        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                        background: isScreenShare ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isScreenShare ? <MonitorOff size={22} /> : <Monitor size={22} />}
                                    </button>
                                </>
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
                                        background: c.type === 'video' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {c.type === 'video' ? <Video size={18} style={{ color: '#8B5CF6' }} /> : <Phone size={18} style={{ color: '#0EA5E9' }} />}
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
                                    background: c.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: c.status === 'completed' ? '#10B981' : '#EF4444',
                                }}>{c.status}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
