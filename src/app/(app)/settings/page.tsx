'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings as SettingsIcon, Palette, Languages, User, Bell, Shield,
    Moon, Sun, Droplets, Sparkles, LogOut, Trash2, Download, ChevronRight, Leaf, Flame
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, setTheme as setThemeStore, clearCurrentUser, exportUserData, deleteUserData } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';
import { LANGUAGES, type LangCode } from '@/lib/translations';
import { useRouter } from 'next/navigation';

const themes = [
    { value: 'light', label: 'Light Mode', icon: Sun, preview: '#F8FAFC' },
    { value: 'dark', label: 'Dark Mode', icon: Moon, preview: '#0B1120' },
    { value: 'nature', label: 'Nature Green', icon: Leaf, preview: '#F0FDF4' },
    { value: 'warm', label: 'Warm Wellness', icon: Flame, preview: '#FFFBF5' },
    { value: 'calm-blue', label: 'Calm Blue', icon: Droplets, preview: '#0C1425' },
    { value: 'gradient', label: 'Modern Gradient', icon: Sparkles, preview: '#0F0720' },
];



export default function SettingsPage() {
    const router = useRouter();
    const { t, setLang: setContextLang } = useLanguage();
    const [user, setUser] = useState(getCurrentUser());
    const [activeTheme, setActiveTheme] = useState(user?.theme || 'light');
    const [activeLang, setActiveLang] = useState<LangCode>((user?.language as LangCode) || 'en');
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });

    const handleThemeChange = (theme: string) => {
        setActiveTheme(theme);
        setThemeStore(theme);
        // setTheme already saves to user profile, just refresh local state
        setUser(getCurrentUser());
    };

    const handleLangChange = (lang: LangCode) => {
        setActiveLang(lang);
        setContextLang(lang); // Update context for live translations
        if (user) {
            const updated = { ...user, language: lang };
            setCurrentUser(updated);
            setUser(updated);
        }
    };

    const handleProfileSave = () => {
        if (user) {
            const updated = { ...user, ...editForm };
            setCurrentUser(updated);
            setUser(updated);
            setEditMode(false);
        }
    };

    const handleExportData = () => {
        const data = exportUserData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `healthsync_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            clearCurrentUser();
            router.push('/auth');
        }
    };

    const handleDeleteAccount = () => {
        if (confirm('This will permanently delete all your health data. Are you sure?')) {
            deleteUserData();
            router.push('/auth');
        }
    };

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>Settings</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Personalize your HealthSync experience</p>
            </div>

            {/* Profile Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={18} /> Profile
                    </h3>
                    <button onClick={() => setEditMode(!editMode)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
                        {editMode ? 'Cancel' : 'Edit'}
                    </button>
                </div>
                {editMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Name</label>
                            <input className="input-field" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Email</label>
                            <input className="input-field" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Phone</label>
                            <input className="input-field" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                        <button className="btn-primary" onClick={handleProfileSave}>Save Changes</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { label: 'Name', value: user?.name },
                            { label: 'Email', value: user?.email },
                            { label: 'Phone', value: user?.phone || 'Not set' },
                            { label: 'Intent', value: user?.intent || 'Not set' },
                        ].map(item => (
                            <div key={item.label} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 14,
                            }}>
                                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                                <span style={{ fontWeight: 600 }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Theme Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Palette size={18} /> Theme
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {themes.map(theme => {
                        const Icon = theme.icon;
                        return (
                            <button key={theme.value} onClick={() => handleThemeChange(theme.value)} style={{
                                padding: '14px 16px', borderRadius: 14,
                                border: `2px solid ${activeTheme === theme.value ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                background: activeTheme === theme.value ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-card)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                                transition: 'all 0.3s ease', color: 'var(--text-primary)',
                            }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: theme.preview, border: '2px solid var(--border-color)' }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{theme.label}</div>
                                </div>
                                <Icon size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Language Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Languages size={18} /> {t('settings.language')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {LANGUAGES.map(lang => (
                        <button key={lang.value} onClick={() => handleLangChange(lang.value)} style={{
                            padding: '12px 16px', borderRadius: 12,
                            border: `2px solid ${activeLang === lang.value ? 'var(--color-primary)' : 'var(--border-color)'}`,
                            background: activeLang === lang.value ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-card)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                            color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
                        }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>{lang.value.toUpperCase()}</span>
                            {lang.nativeLabel} ({lang.label})
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Data & Privacy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} /> Data & Privacy
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={handleExportData} style={{
                        padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: 'var(--text-primary)', fontSize: 14,
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Download size={16} /> Export My Health Data
                        </span>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button onClick={handleLogout} style={{
                        padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#F59E0B', fontSize: 14,
                    }}>
                        <LogOut size={16} /> Sign Out
                    </button>
                    <button onClick={handleDeleteAccount} style={{
                        padding: '14px 16px', borderRadius: 12,
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.04)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#EF4444', fontSize: 14,
                    }}>
                        <Trash2 size={16} /> Delete Account & Data
                    </button>
                </div>
            </motion.div>

            <div style={{
                padding: '16px 20px', borderRadius: 14,
                background: 'rgba(14, 165, 233, 0.04)',
                border: '1px solid rgba(14, 165, 233, 0.1)',
                fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6,
            }}>
                Your data is encrypted (AES-256) and stored in compliance with<br />
                DPDP Act 2023 • ABDM Standards • HL7 FHIR • MCI Telemedicine Guidelines 2020
            </div>
        </div>
    );
}
