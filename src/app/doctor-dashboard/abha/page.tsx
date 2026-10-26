'use client';

import { useState } from 'react';
import { Database, Search, User, FileText, Droplets, HeartPulse, History, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { type ABHARecord } from '@/lib/store';
import { getPatientByAbhaId } from '@/lib/abhaDb';
import { motion, AnimatePresence } from 'framer-motion';

export default function ABHARegistryPage() {
    const [abhaId, setAbhaId] = useState('');
    const [loading, setLoading] = useState(false);
    const [record, setRecord] = useState<ABHARecord | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!abhaId.trim()) return;

        setLoading(true);
        setError(null);
        setRecord(null);

        // Simulate API call delay
        setTimeout(() => {
            const abhaPatient = getPatientByAbhaId(abhaId.trim());
            if (abhaPatient) {
                const mappedRecord: ABHARecord = {
                    id: abhaPatient.abhaId,
                    name: abhaPatient.name,
                    age: 42, // Mock calculated age
                    gender: 'Male', // Mock
                    bloodGroup: abhaPatient.bloodGroup,
                    lastUpdated: new Date().toISOString(),
                    medicalHistory: abhaPatient.medicalHistory ? [abhaPatient.medicalHistory] : [],
                    conditions: ['None active'],
                    medications: []
                };
                setRecord(mappedRecord);
            } else {
                setError('No records found for this ABHA ID. Please check the ID and try again.');
            }
            setLoading(false);
        }, 800);
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={24} color="white" />
                </div>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>ABHA Registry</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Access national health records securely via ABHA ID</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="glass-card-static" style={{ padding: 24, marginBottom: 24 }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Enter ABHA ID (e.g., 91-0000-0000-0000 or patient@abdm)"
                            value={abhaId}
                            onChange={(e) => setAbhaId(e.target.value)}
                            className="input-field"
                            style={{ width: '100%', paddingLeft: 44, paddingRight: 16, height: 50, fontSize: 16, fontWeight: 500 }}
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading || !abhaId.trim()} style={{ height: 50, padding: '0 32px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {loading ? 'Searching...' : 'Search Registry'}
                    </button>
                </form>
            </div>

            {/* Error State */}
            {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{
                    padding: 16, borderRadius: 12, background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.2)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24
                }}>
                    <AlertTriangle size={20} color="#DC2626" />
                    <span style={{ color: '#DC2626', fontWeight: 500 }}>{error}</span>
                </motion.div>
            )}

            {/* Result State */}
            <AnimatePresence>
                {record && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
                            {/* Patient Profile Summary */}
                            <div className="glass-card-static" style={{ padding: 24, height: 'fit-content' }}>
                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                                        fontSize: 28, fontWeight: 700, color: 'white'
                                    }}>
                                        {record.name.charAt(0)}
                                    </div>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        {record.name} <CheckCircle size={16} color="#059669" />
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>ABHA: {record.id}</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Age / Gender</span>
                                        <span style={{ fontWeight: 600 }}>{record.age}y / {record.gender}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Droplets size={14} /> Blood Group</span>
                                        <span style={{ fontWeight: 600, color: '#DC2626' }}>{record.bloodGroup}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><History size={14} /> Last Updated</span>
                                        <span style={{ fontWeight: 600 }}>{new Date(record.lastUpdated).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {/* Medical History */}
                                <div className="glass-card-static" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Medical History
                                    </h3>
                                    {record.medicalHistory.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {record.medicalHistory.map((history, idx) => (
                                                <div key={idx} style={{ padding: 12, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />
                                                    <span style={{ fontWeight: 500 }}>{history}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No significant medical history recorded.</p>
                                    )}
                                </div>

                                {/* Active Conditions */}
                                <div className="glass-card-static" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <HeartPulse size={18} style={{ color: '#DC2626' }} /> Active Conditions
                                    </h3>
                                    {record.conditions.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                            {record.conditions.map((condition, idx) => (
                                                <span key={idx} style={{
                                                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                    background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.2)'
                                                }}>
                                                    {condition}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No active conditions recorded.</p>
                                    )}
                                </div>

                                {/* Current Medications */}
                                <div className="glass-card-static" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Database size={18} style={{ color: '#059669' }} /> Current Medications
                                    </h3>
                                    {record.medications.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                            {record.medications.map((med, idx) => (
                                                <span key={idx} style={{
                                                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                    background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.2)'
                                                }}>
                                                    {med}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No current medications recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
