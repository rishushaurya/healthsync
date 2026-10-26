'use client';

import { abhaDatabase, updateAbhaRecord } from '@/lib/abhaDb';
import { User, CreditCard, Edit, Save } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AbhaPatientPortal() {
    const router = useRouter();
    const [patientSearchId, setPatientSearchId] = useState('');
    const [activePatient, setActivePatient] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    const handlePatientSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const found = abhaDatabase.find(p => p.abhaId === patientSearchId);
        if (found) {
            setActivePatient(found);
            setEditForm(found);
            setIsEditing(false);
        } else {
            alert('ABHA ID not found in the national registry.');
            setActivePatient(null);
        }
    };

    const handleSaveDetails = () => {
        setActivePatient(editForm);
        updateAbhaRecord(editForm.abhaId, editForm);
        setIsEditing(false);
        alert('Details successfully updated in the National Health Registry!');
    };

    return (
        <div style={{ padding: 40, background: 'var(--bg-default)', minHeight: '100vh', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>ABHA Patient Self-Service</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>View and manage your national health identity</p>
                    </div>
                </div>
                <button onClick={() => router.push('/auth')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }}>Sign Out</button>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {!activePatient ? (
                    <div className="glass-card" style={{ padding: 60, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CreditCard size={40} color="#059669" />
                        </div>
                        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Access Your ABHA Card</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: 16, lineHeight: 1.6 }}>
                            Enter your 14-digit Ayushman Bharat Health Account number to view your digital identity, update your details, or check your linked medical history.
                        </p>
                        
                        <form onSubmit={handlePatientSearch} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto' }}>
                            <input 
                                type="text" 
                                placeholder="e.g. 91-XXXX-XXXX-XXXX" 
                                value={patientSearchId}
                                onChange={(e) => setPatientSearchId(e.target.value)}
                                className="input-field" 
                                style={{ padding: 16, fontSize: 16, textAlign: 'center' }}
                                required
                            />
                            <button type="submit" className="btn-primary" style={{ background: '#059669', padding: '16px', fontSize: 16, fontWeight: 700 }}>
                                Access Identity
                            </button>
                        </form>
                    </div>
                ) : (
                    <div>
                        <button onClick={() => setActivePatient(null)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', marginBottom: 24, fontWeight: 600, fontSize: 15 }}>
                            ← Back to Search
                        </button>

                        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Physical Card Representation */}
                            <div style={{ 
                                width: 420, background: '#ffffff', borderRadius: 20, overflow: 'hidden',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid rgba(5, 150, 105, 0.2)'
                            }}>
                                <div style={{ background: '#059669', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 800, fontSize: 20 }}>ABHA Health Card</div>
                                    <CreditCard size={28} />
                                </div>
                                <div style={{ padding: 32, display: 'flex', gap: 24 }}>
                                    <div style={{ width: 100, height: 120, background: '#e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                        <User size={48} color="#94a3b8" />
                                    </div>
                                    <div style={{ flex: 1, paddingTop: 4 }}>
                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>{activePatient.name}</div>
                                        
                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>ABHA Number</div>
                                        <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', letterSpacing: 1.5 }}>{activePatient.abhaId}</div>
                                    </div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '20px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: '1px solid #e2e8f0' }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 0.5 }}>BLOOD GROUP</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>{activePatient.bloodGroup}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 0.5 }}>GOVT ID</div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Verified ✓</div>
                                    </div>
                                </div>
                            </div>

                            {/* Details & Edit Form */}
                            <div className="glass-card" style={{ flex: 1, minWidth: 400, padding: 32 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                                    <h3 style={{ fontSize: 22, fontWeight: 800 }}>Personal Details</h3>
                                    {!isEditing ? (
                                        <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                                            <Edit size={16} /> Edit Details
                                        </button>
                                    ) : (
                                        <button onClick={handleSaveDetails} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                                            <Save size={16} /> Save Changes
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gap: 20 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                                        {isEditing ? (
                                            <input type="text" className="input-field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: 12, fontSize: 16 }} />
                                        ) : (
                                            <div style={{ fontWeight: 600, fontSize: 16 }}>{activePatient.name}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
                                        {isEditing ? (
                                            <input type="email" className="input-field" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ width: '100%', padding: 12, fontSize: 16 }} />
                                        ) : (
                                            <div style={{ fontWeight: 600, fontSize: 16 }}>{activePatient.email}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone Number</label>
                                        {isEditing ? (
                                            <input type="tel" className="input-field" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: 12, fontSize: 16 }} />
                                        ) : (
                                            <div style={{ fontWeight: 600, fontSize: 16 }}>{activePatient.phone}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Known Medical History</label>
                                        {isEditing ? (
                                            <textarea className="input-field" value={editForm.medicalHistory} onChange={e => setEditForm({...editForm, medicalHistory: e.target.value})} style={{ width: '100%', padding: 12, fontSize: 16, minHeight: 100 }} />
                                        ) : (
                                            <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.5 }}>{activePatient.medicalHistory || 'None reported'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
