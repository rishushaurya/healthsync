'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Stethoscope, LayoutDashboard, Users, FileText, Phone,
    ClipboardList, User, Settings, LogOut, Menu, X
} from 'lucide-react';
import { getCurrentDoctor, clearCurrentDoctor, setDoctorTheme, getDoctorTheme, type DoctorAccount } from '@/lib/store';

const navItems = [
    { label: 'Dashboard', href: '/doctor-dashboard', icon: LayoutDashboard },
    { label: 'My Patients', href: '/doctor-dashboard/patients', icon: Users },
    { label: 'Prescriptions', href: '/doctor-dashboard/prescriptions', icon: FileText },
    { label: 'Calls', href: '/doctor-dashboard/calls', icon: Phone },
    { label: 'Notes', href: '/doctor-dashboard/notes', icon: ClipboardList },
    { label: 'Profile', href: '/doctor-dashboard/profile', icon: User },
    { label: 'Settings', href: '/doctor-dashboard/settings', icon: Settings },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) { router.push('/auth'); return; }
        setDoctor(doc);
        const t = getDoctorTheme();
        document.documentElement.setAttribute('data-theme', t);
    }, [router]);

    const handleLogout = () => { clearCurrentDoctor(); router.push('/auth'); };

    if (!doctor) return null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <aside style={{
                width: 240, background: 'var(--glass-bg)', borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
                backdropFilter: 'blur(20px)', transition: 'transform 0.3s ease',
            }}>
                {/* Logo */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Stethoscope size={18} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Doctor Portal</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>HealthSync</div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const active = pathname === item.href || (item.href !== '/doctor-dashboard' && pathname.startsWith(item.href));
                        return (
                            <button key={item.href} onClick={() => { router.push(item.href); setMobileOpen(false); }} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                                background: active ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                                color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500,
                                transition: 'all 0.2s ease', width: '100%', textAlign: 'left',
                            }}>
                                <Icon size={18} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Doctor Info & Logout */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                            {doctor.image || doctor.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doctor.specialty}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8,
                        background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 500, width: '100%',
                    }}>
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{
                display: 'none', position: 'fixed', top: 16, left: 16, zIndex: 60,
                width: 40, height: 40, borderRadius: 10, background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)',
                alignItems: 'center', justifyContent: 'center',
            }}>
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Main Content */}
            <main style={{ flex: 1, marginLeft: 240, padding: '24px 32px', maxWidth: 1200 }}>
                {children}
            </main>
        </div>
    );
}
