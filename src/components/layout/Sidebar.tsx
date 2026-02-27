'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, clearCurrentUser, getUnreadNotificationCount } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';
import {
    LayoutDashboard, Brain, HeartPulse, FileText, Pill,
    Stethoscope, Users, Settings, Phone, LogOut, Menu,
    Activity, ClipboardList, Bell
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', tKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/digital-twin', tKey: 'nav.digitalTwin', icon: Brain },
    { href: '/vitals', tKey: 'nav.vitals', icon: HeartPulse },
    { href: '/reports', tKey: 'nav.reports', icon: FileText },
    { href: '/recovery', tKey: 'nav.recovery', icon: Activity },
    { href: '/doctors', tKey: 'nav.doctors', icon: Stethoscope },
    { href: '/prescriptions', tKey: 'nav.prescriptions', icon: ClipboardList },
    { href: '/calls', tKey: 'nav.calls', icon: Phone },
    { href: '/recovery-circle', tKey: 'nav.recoveryCircle', icon: Users },
    { href: '/medicines', tKey: 'nav.medicines', icon: Pill },
    { href: '/notifications', tKey: 'nav.notifications', icon: Bell, showBadge: true },
    { href: '/settings', tKey: 'nav.settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = getCurrentUser();

    useEffect(() => {
        const styleId = 'sidebar-mobile-styles';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            @media (max-width: 768px) {
                .mobile-menu-btn { display: flex !important; }
                aside {
                    transform: translateX(${mobileOpen ? '0' : '-100%'}) !important;
                    width: 260px !important;
                }
            }
        `;
        return () => { styleEl?.remove(); };
    }, [mobileOpen]);

    const handleLogout = () => {
        if (confirm('Are you sure you want to sign out?')) {
            clearCurrentUser();
            window.location.href = '/auth';
        }
    };

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                style={{
                    position: 'fixed', top: 16, left: 16, zIndex: 1002,
                    display: 'none', width: 44, height: 44, borderRadius: 12,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    backdropFilter: 'blur(16px)',
                }}
                className="mobile-menu-btn"
            >
                <Menu size={20} style={{ color: 'var(--text-primary)' }} />
            </button>

            {/* Backdrop */}
            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    zIndex: 998, backdropFilter: 'blur(4px)',
                }} />
            )}

            {/* Sidebar */}
            <aside style={{
                width: collapsed ? 72 : 240,
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--border-color)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                zIndex: 999,
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: collapsed ? '20px 12px' : '20px 18px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--border-color)',
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <HeartPulse size={20} style={{ color: 'white' }} />
                    </div>
                    {!collapsed && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>HealthSync</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Recovery System</div>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        const badge = (item as any).showBadge ? getUnreadNotificationCount() : 0;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px' : '12px 16px', position: 'relative' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon size={18} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>{t(item.tKey)}</span>}
                                {badge > 0 && (
                                    <span style={{
                                        position: 'absolute', top: 6, right: collapsed ? 6 : 10,
                                        width: 18, height: 18, borderRadius: '50%', background: '#EF4444',
                                        color: 'white', fontSize: 10, fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>{badge > 9 ? '9+' : badge}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* SOS Button */}
                <div style={{ padding: '8px 8px' }}>
                    <a href="tel:112" style={{
                        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 10, padding: '12px 16px', borderRadius: 12,
                        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#EF4444', fontWeight: 600, fontSize: 14,
                        textDecoration: 'none', transition: 'all 0.2s ease',
                    }}>
                        <Phone size={16} />
                        {!collapsed && 'Emergency SOS'}
                    </a>
                </div>

                {/* User profile */}
                <div style={{
                    padding: collapsed ? '16px 8px' : '16px',
                    borderTop: '1px solid var(--border-color)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: collapsed ? 0 : 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'var(--gradient-primary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0,
                        }}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {!collapsed && (
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <button onClick={handleLogout} style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            background: 'none', border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            <LogOut size={14} /> {t('nav.signOut')}
                        </button>
                    )}
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        position: 'absolute', top: 72, right: -12, width: 24, height: 24,
                        borderRadius: '50%', background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', fontSize: 12,
                    }}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </aside>

        </>
    );
}
