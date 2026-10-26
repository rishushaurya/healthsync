'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, PhoneIncoming, Video } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, generateId, type CallLog } from '@/lib/store';
import { cloudGetActiveCall, cloudUpdateCallLog, cloudAddNotification } from '@/lib/shared-store';

export default function IncomingCallOverlay() {
    const router = useRouter();
    const pathname = usePathname();
    const [userId, setUserId] = useState('');
    const [activeCall, setActiveCall] = useState<CallLog | null>(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (user) setUserId(user.id);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(async () => {
            const call = await cloudGetActiveCall();
            if (call && call.userId === userId && call.status === 'ringing') {
                setActiveCall(call);
            } else {
                setActiveCall(null);
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [userId]);

    const acceptCall = async () => {
        if (!activeCall) return;
        await cloudUpdateCallLog(activeCall.id, { status: 'ongoing' });
        await cloudAddNotification({
            id: generateId(), userId, type: 'call',
            title: `${activeCall.type === 'video' ? 'Video' : 'Audio'} Call Started`,
            message: `Connected with ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(), read: false,
        });
        setActiveCall(null);
        if (pathname !== '/calls') router.push('/calls');
    };

    const rejectCall = async () => {
        if (!activeCall) return;
        await cloudUpdateCallLog(activeCall.id, { status: 'missed', endTime: new Date().toISOString() });
        await cloudAddNotification({
            id: generateId(), userId, type: 'call',
            title: 'Missed Call',
            message: `Missed call from ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(), read: false,
        });
        setActiveCall(null);
    };

    // Don't show overlay if already on calls page (it has its own UI)
    if (pathname === '/calls') return null;

    return (
        <AnimatePresence>
            {activeCall && activeCall.status === 'ringing' && (
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxWidth: 420,
                        padding: '20px 24px',
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #0B1120f5, #1a0b2ef5)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(14,165,233,0.4)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(14,165,233,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                    }}>
                        {/* Left: Pulsing icon */}
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            style={{
                                width: 52, height: 52, borderRadius: 16,
                                background: activeCall.type === 'video'
                                    ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                                    : 'linear-gradient(135deg, #10B981, #0EA5E9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {activeCall.type === 'video'
                                ? <Video size={24} style={{ color: 'white' }} />
                                : <PhoneIncoming size={24} style={{ color: 'white' }} />
                            }
                        </motion.div>

                        {/* Center: Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {activeCall.doctorName}
                            </div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                                Incoming {activeCall.type === 'video' ? 'Video' : 'Audio'} Call
                            </div>
                        </div>

                        {/* Right: Action buttons */}
                        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); rejectCall(); }}
                                style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    border: 'none', cursor: 'pointer',
                                    background: '#EF4444', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                                    WebkitTapHighlightColor: 'transparent',
                                    touchAction: 'manipulation',
                                }}
                            >
                                <PhoneOff size={20} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); acceptCall(); }}
                                style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    border: 'none', cursor: 'pointer',
                                    background: '#10B981', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                                    WebkitTapHighlightColor: 'transparent',
                                    touchAction: 'manipulation',
                                }}
                            >
                                <Phone size={20} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
