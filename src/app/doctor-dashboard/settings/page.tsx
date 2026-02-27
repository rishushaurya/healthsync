'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Sun, Moon, Droplets, Sparkles, Leaf, Flame, Download
} from 'lucide-react';
import { getCurrentDoctor, getDoctorTheme, setDoctorTheme, type DoctorAccount } from '@/lib/store';

const themes = [
    { value: 'light', label: 'Light Mode', icon: Sun, preview: '#F8FAFC' },
    { value: 'dark', label: 'Dark Mode', icon: Moon, preview: '#0B1120' },
    { value: 'nature', label: 'Nature Green', icon: Leaf, preview: '#F0FDF4' },
    { value: 'warm', label: 'Warm Wellness', icon: Flame, preview: '#FFFBF5' },
    { value: 'calm-blue', label: 'Calm Blue', icon: Droplets, preview: '#0C1425' },
    { value: 'gradient', label: 'Modern Gradient', icon: Sparkles, preview: '#0F0720' },
];

export default function DoctorSettingsPage() {
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [activeTheme, setActiveTheme] = useState('dark');

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        setActiveTheme(getDoctorTheme());
    }, []);

    const handleThemeChange = (theme: string) => {
        setActiveTheme(theme);
        setDoctorTheme(theme);
    };

    if (!doctor) return null;

    return (
        <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Settings</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Customize your Doctor Portal</p>

            {/* Theme Selection */}
            <div className="glass-card-static" style={{ padding: 22, marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Settings size={16} /> Theme
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {themes.map(t => {
                        const Icon = t.icon;
                        const active = activeTheme === t.value;
                        return (
                            <motion.button key={t.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => handleThemeChange(t.value)} style={{
                                    padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                                    background: active ? 'rgba(14,165,233,0.1)' : 'var(--bg-card)',
                                    border: active ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                    color: 'var(--text-primary)', transition: 'all 0.2s ease',
                                }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: t.preview, margin: '0 auto 8px', border: '1px solid var(--border-color)' }} />
                                <Icon size={16} style={{ color: active ? 'var(--color-primary)' : 'var(--text-muted)', marginBottom: 4 }} />
                                <div style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>{t.label}</div>
                            </motion.button>
                        );
                    })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                    Your theme is independent of patient themes.
                </p>
            </div>

            {/* Info */}
            <div className="glass-card-static" style={{ padding: 22 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Account</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                    <div>Name: <strong>{doctor.name}</strong></div>
                    <div>Email: <strong>{doctor.email}</strong></div>
                    <div>Specialty: <strong>{doctor.specialty}</strong></div>
                    <div>Hospital: <strong>{doctor.hospital}</strong></div>
                </div>
            </div>
        </div>
    );
}
