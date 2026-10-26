'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser, clearCurrentUser, getUnreadNotificationCount, type UserProfile } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';
import {
    LayoutDashboard, HeartPulse, Pill, Settings, Phone, LogOut, Menu, X,
    Activity, ClipboardPlus, Bell, Video, FileText, Users, HandHeart, PersonStanding,
} from 'lucide-react';

const navGroups = [
    {
        label: 'Care',
        items: [
            { href: '/journey/patient-portal', tKey: 'Home', icon: LayoutDashboard },
            { href: '/journey/intake', tKey: 'New check-in', icon: ClipboardPlus },
            { href: '/journey/digital-twin', tKey: 'Digital Twin', icon: PersonStanding },
            { href: '/calls', tKey: 'Consultations', icon: Video },
            { href: '/prescriptions', tKey: 'Prescriptions', icon: FileText },
        ],
    },
    {
        label: 'My health',
        items: [
            { href: '/vitals', tKey: 'nav.vitals', icon: HeartPulse },
            { href: '/recovery', tKey: 'Recovery plan', icon: Activity },
            { href: '/medicines', tKey: 'Medicines', icon: Pill },
        ],
    },
    {
        label: 'Family & support',
        items: [
            { href: '/family', tKey: 'Family', icon: Users },
            { href: '/recovery-circle', tKey: 'Recovery circle', icon: HandHeart },
        ],
    },
    {
        label: 'Account',
        items: [
            { href: '/notifications', tKey: 'Notifications', icon: Bell, showBadge: true },
            { href: '/settings', tKey: 'nav.settings', icon: Settings },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [user, setUser] = useState<UserProfile | null>(null);
    const label = (key: string) => (t(key) === key ? key : t(key));

    useEffect(() => {
        setUser(getCurrentUser());
        setNotifCount(getUnreadNotificationCount());
    }, [pathname]);

    useEffect(() => setMobileOpen(false), [pathname]);

    const handleLogout = () => {
        if (confirm('Are you sure you want to sign out?')) {
            clearCurrentUser();
            window.location.href = '/auth';
        }
    };

    const brand = (
        <Link href="/journey/patient-portal" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <HeartPulse size={19} color="#fff" />
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>HealthSync</span>
        </Link>
    );

    return (
        <>
            <div className="mobile-topbar">
                {brand}
                <button className="btn-ghost" style={{ padding: 10 }} aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
                    <Menu size={22} />
                </button>
            </div>

            {mobileOpen && <div className="app-scrim" onClick={() => setMobileOpen(false)} />}

            <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Patient navigation" style={{
                width: 264, height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 50,
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)',
                transition: 'transform 0.25s ease',
            }}>
                <div style={{ height: 68, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
                    {brand}
                    {mobileOpen && (
                        <button className="btn-ghost" style={{ padding: 8, minHeight: 40 }} aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
                    {navGroups.map(group => (
                        <div key={group.label} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 14px' }}>
                                {group.label}
                            </div>
                            {group.items.map(item => {
                                const active = pathname === item.href || (item.href !== '/journey/patient-portal' && pathname.startsWith(item.href));
                                const Icon = item.icon;
                                const badge = 'showBadge' in item && notifCount > 0 ? notifCount : 0;
                                return (
                                    <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                                        <Icon size={19} style={{ flexShrink: 0 }} />
                                        <span style={{ flex: 1 }}>{label(item.tKey)}</span>
                                        {badge > 0 && (
                                            <span aria-label={`${badge} unread`} style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: 'var(--color-danger)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                                                {badge > 9 ? '9+' : badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div style={{ padding: '0 12px 12px' }}>
                    <Link href="/emergency" className="btn-danger" style={{ width: '100%' }}>
                        <Phone size={17} /> Emergency SOS
                    </Link>
                </div>

                <div style={{ padding: 14, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                        {user?.avatar
                            ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Patient'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.phone || user?.email || ''}</div>
                    </div>
                    <button onClick={handleLogout} className="btn-ghost" aria-label={label('nav.signOut')} title={label('nav.signOut')} style={{ padding: 8, minHeight: 40, color: 'var(--text-muted)' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>
        </>
    );
}
