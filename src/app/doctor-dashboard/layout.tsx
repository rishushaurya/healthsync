'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    Stethoscope, LayoutDashboard, Users, FileText, Phone,
    ClipboardList, User, Settings, LogOut, Menu, X, Mic, Database
} from 'lucide-react';
import { getCurrentDoctor, clearCurrentDoctor, getDoctorTheme, type DoctorAccount } from '@/lib/store';

const navItems = [
    { label: 'Dashboard', href: '/doctor-dashboard', icon: LayoutDashboard },
    { label: 'My Patients', href: '/doctor-dashboard/patients', icon: Users },
    { label: 'Calls', href: '/doctor-dashboard/calls', icon: Phone },
    { label: 'Prescriptions', href: '/doctor-dashboard/prescriptions', icon: FileText },
    { label: 'Recorder', href: '/doctor-dashboard/recorder', icon: Mic },
    { label: 'Notes', href: '/doctor-dashboard/notes', icon: ClipboardList },
    { label: 'ABHA Registry', href: '/doctor-dashboard/abha', icon: Database },
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
        if (!doc) { router.push('/auth?role=doctor'); return; }
        setDoctor(doc);
        document.documentElement.setAttribute('data-theme', getDoctorTheme());
    }, [router]);

    useEffect(() => setMobileOpen(false), [pathname]);

    const handleLogout = () => { clearCurrentDoctor(); router.push('/auth?role=doctor'); };

    if (!doctor) return null;

    const brand = (
        <Link href="/doctor-dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Stethoscope size={18} color="#fff" />
            </span>
            <span>
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>HealthSync</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>Doctor portal</span>
            </span>
        </Link>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <div className="mobile-topbar">
                {brand}
                <button className="btn-ghost" style={{ padding: 10 }} aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
                    <Menu size={22} />
                </button>
            </div>

            {mobileOpen && <div className="app-scrim" onClick={() => setMobileOpen(false)} />}

            <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Doctor navigation" style={{
                width: 264, background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
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

                <nav style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const active = pathname === item.href || (item.href !== '/doctor-dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                                <Icon size={19} style={{ flexShrink: 0 }} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: 14, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                        {doctor.image?.startsWith('data:image') || doctor.image?.startsWith('http')
                            ? <img src={doctor.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : doctor.image || doctor.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doctor.specialty}</div>
                    </div>
                    <button onClick={handleLogout} className="btn-ghost" aria-label="Sign out" title="Sign out" style={{ padding: 8, minHeight: 40, color: 'var(--text-muted)' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            <main className="app-main" style={{ maxWidth: 1400 }}>
                {children}
            </main>
        </div>
    );
}
