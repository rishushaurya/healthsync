'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Package, FileText, Calendar, Phone, CheckCircle, Filter, Check } from 'lucide-react';
import { getCurrentUser, type Notification } from '@/lib/store';
import { cloudGetNotifications, cloudMarkNotificationRead, cloudMarkAllNotificationsRead } from '@/lib/shared-store';
import { useLanguage } from '@/lib/LanguageProvider';

const typeIcons: Record<string, typeof Bell> = {
    order: Package, prescription: FileText, appointment: Calendar, call: Phone, system: Bell,
};
const typeColors: Record<string, string> = {
    order: '#8B5CF6', prescription: '#0EA5E9', appointment: '#10B981', call: '#F59E0B', system: '#6B7280',
};

export default function NotificationsPage() {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [userId, setUserId] = useState('');

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) return;
        setUserId(user.id);
        cloudGetNotifications(user.id).then(n => setNotifications(n.slice().reverse()));
    }, []);

    const handleMarkRead = async (id: string) => {
        await cloudMarkNotificationRead(userId, id);
        const n = await cloudGetNotifications(userId);
        setNotifications(n.slice().reverse());
    };

    const handleMarkAllRead = async () => {
        await cloudMarkAllNotificationsRead(userId);
        const n = await cloudGetNotifications(userId);
        setNotifications(n.slice().reverse());
    };

    const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Notifications</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
                        <Check size={14} /> Mark all read
                    </button>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {['all', 'order', 'prescription', 'appointment', 'call', 'system'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: filter === f ? 'rgba(14,165,233,0.08)' : 'var(--bg-card)',
                        color: filter === f ? 'var(--color-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    }}>{f}</button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="glass-card-static" style={{ padding: 60, textAlign: 'center' }}>
                    <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: 14, opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No notifications</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map((n, i) => {
                        const Icon = typeIcons[n.type] || Bell;
                        const color = typeColors[n.type] || '#6B7280';
                        return (
                            <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className={n.read ? 'glass-card-static' : 'glass-card'}
                                style={{
                                    padding: 16, cursor: 'pointer', position: 'relative',
                                    borderLeft: n.read ? 'none' : `3px solid ${color}`,
                                }}
                                onClick={() => !n.read && handleMarkRead(n.id)}
                            >
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon size={18} style={{ color }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                            {new Date(n.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                    {!n.read && (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
