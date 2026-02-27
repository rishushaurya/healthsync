'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react';
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
        if (user) {
            setUserId(user.id);
        }
    }, []);

    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(async () => {
            const call = await cloudGetActiveCall();
            // If there's an active ringing call for this user
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

        // Update the call status to ongoing
        await cloudUpdateCallLog(activeCall.id, { status: 'ongoing' });

        await cloudAddNotification({
            id: generateId(),
            userId,
            type: 'call',
            title: `${activeCall.type === 'video' ? 'Video' : 'Audio'} Call Started`,
            message: `Connected with ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(),
            read: false,
        });

        setActiveCall(null);

        // Redirect to the calls page to handle the ongoing call UI
        if (pathname !== '/calls') {
            router.push('/calls');
        }
    };

    const rejectCall = async () => {
        if (!activeCall) return;

        await cloudUpdateCallLog(activeCall.id, { status: 'missed', endTime: new Date().toISOString() });

        await cloudAddNotification({
            id: generateId(),
            userId,
            type: 'call',
            title: 'Missed Call',
            message: `Missed call from ${activeCall.doctorName}`,
            timestamp: new Date().toISOString(),
            read: false,
        });

        setActiveCall(null);
    };

    // Don't show the global overlay if we are already on the calls page,
    // because the calls page handles its own ringing UI to prevent duplicate overlays.
    if (pathname === '/calls') return null;

    return (
        <AnimatePresence>
            {activeCall && activeCall.status === 'ringing' && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    style={{
                        position: 'fixed',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        padding: '24px 32px',
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #0B1120ee, #1a0b2eee)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(14,165,233,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                        minWidth: 320,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    }}
                >
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <PhoneIncoming size={36} style={{ color: '#10B981' }} />
                    </motion.div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                            Incoming {activeCall.type === 'video' ? 'Video' : 'Audio'} Call
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                            {activeCall.doctorName}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 10000 }}>
                        <button onClick={rejectCall} style={{
                            width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }}>
                            <PhoneOff size={22} />
                        </button>
                        <button onClick={acceptCall} style={{
                            width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                        }}>
                            <Phone size={22} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
