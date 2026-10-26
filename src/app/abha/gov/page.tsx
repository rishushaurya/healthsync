'use client';

import { abhaDatabase } from '@/lib/abhaDb';
import { Database, Copy, CheckCircle, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AbhaGovPortal() {
    const router = useRouter();
    const [copiedId, setCopiedId] = useState('');
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState(abhaDatabase);

    useEffect(() => {
        // Reload in case another tab or the patient portal updated it via localStorage
        const stored = localStorage.getItem('abhaDatabase_v1');
        if (stored) {
            setPatients(JSON.parse(stored));
        } else {
            setPatients(abhaDatabase);
        }
    }, []);

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const filteredData = patients.filter((p: any) => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.abhaId.includes(search)
    );

    return (
        <div style={{ padding: 40, background: 'var(--bg-default)', minHeight: '100vh', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Database size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>ABHA National Database (Government)</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Central authority view of the Ayushman Bharat Health Account ecosystem</p>
                    </div>
                </div>
                <button onClick={() => router.push('/auth')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }}>Sign Out</button>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                        <Search size={18} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search National Registry by Name or ID..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field" 
                            style={{ width: '100%', padding: '16px 16px 16px 44px' }}
                        />
                    </div>
                </div>

                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>ABHA ID</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Patient Name</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Contact</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Blood Group</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Medical History</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((patient, i) => (
                                <tr key={patient.abhaId} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-card)' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>{patient.abhaId}</span>
                                            <button 
                                                onClick={() => handleCopy(patient.abhaId)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                title="Copy ID"
                                            >
                                                {copiedId === patient.abhaId ? <CheckCircle size={16} color="#059669" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: 500 }}>{patient.name}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontSize: 14 }}>{patient.phone}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{patient.email}</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: 4, background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', fontWeight: 600, fontSize: 12 }}>
                                            {patient.bloodGroup}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
                                        {patient.medicalHistory ? (
                                            <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', borderRadius: 12, border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                                                {patient.medicalHistory}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>No major history</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No patients found matching your search.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
