'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Save, Briefcase, GraduationCap, Clock, IndianRupee, Plus, X
} from 'lucide-react';
import { getCurrentDoctor, getDoctorProfile, updateDoctorProfile, type DoctorAccount } from '@/lib/store';

export default function DoctorProfilePage() {
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [profile, setProfile] = useState<Record<string, unknown>>({});
    const [saved, setSaved] = useState(false);
    const [newQual, setNewQual] = useState('');

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);
        const p = getDoctorProfile(doc.id);
        setProfile((p || {}) as unknown as Record<string, unknown>);
    }, []);

    const updateField = (key: string, value: unknown) => {
        setProfile(prev => ({ ...prev, [key]: value }));
    };

    const addQualification = () => {
        if (!newQual.trim()) return;
        const quals = ((profile.qualifications as string[]) || []);
        updateField('qualifications', [...quals, newQual.trim()]);
        setNewQual('');
    };

    const removeQualification = (i: number) => {
        const quals = ((profile.qualifications as string[]) || []).filter((_, idx) => idx !== i);
        updateField('qualifications', quals);
    };

    const saveProfile = () => {
        if (!doctor) return;
        updateDoctorProfile(doctor.id, profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!doctor) return null;

    return (
        <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>My Profile</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Manage your professional information</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Basic Info */}
                <div className="glass-card-static" style={{ padding: 22 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={16} /> Basic Information
                    </h3>
                    {[
                        { key: 'name', label: 'Full Name', placeholder: 'Dr. John Doe' },
                        { key: 'email', label: 'Email', placeholder: 'doctor@example.com' },
                        { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                        { key: 'specialty', label: 'Specialty', placeholder: 'e.g., Cardiologist' },
                        { key: 'hospital', label: 'Hospital/Clinic', placeholder: 'e.g., AIIMS Delhi' },
                        { key: 'experience', label: 'Experience', placeholder: 'e.g., 15 yrs' },
                    ].map(f => (
                        <div key={f.key} style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                            <input className="input-field" placeholder={f.placeholder}
                                value={(profile[f.key] as string) || ''} onChange={e => updateField(f.key, e.target.value)} />
                        </div>
                    ))}
                </div>

                {/* Professional */}
                <div>
                    <div className="glass-card-static" style={{ padding: 22, marginBottom: 20 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Briefcase size={16} /> Professional Details
                        </h3>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bio</label>
                            <textarea className="input-field" placeholder="Write a short bio..." rows={3}
                                value={(profile.bio as string) || ''} onChange={e => updateField('bio', e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                <IndianRupee size={12} style={{ display: 'inline' }} /> Consultation Fee (₹)
                            </label>
                            <input className="input-field" type="number" placeholder="500"
                                value={(profile.consultationFee as number) || ''} onChange={e => updateField('consultationFee', Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="glass-card-static" style={{ padding: 22 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <GraduationCap size={16} /> Qualifications
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {((profile.qualifications as string[]) || []).map((q, i) => (
                                <span key={i} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'rgba(14,165,233,0.08)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {q} <button onClick={() => removeQualification(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}><X size={10} /></button>
                                </span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input className="input-field" placeholder="e.g., MBBS, MD Cardiology" value={newQual} onChange={e => setNewQual(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addQualification()} />
                            <button onClick={addQualification} style={{
                                padding: '0 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                cursor: 'pointer', color: 'var(--color-primary)',
                            }}><Plus size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn-primary" onClick={saveProfile} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px' }}>
                    <Save size={16} /> Save Profile
                </button>
                {saved && (
                    <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        style={{ color: '#10B981', fontWeight: 600, fontSize: 13 }}>Profile saved!</motion.span>
                )}
            </div>
        </div>
    );
}
