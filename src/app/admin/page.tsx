'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Users, Droplet, Building2, Activity, ServerCrash } from 'lucide-react';
import { abhaDatabase } from '@/lib/abhaDb';
import { getIntakeSummaries } from '@/lib/store';

export default function AdminPortal() {
    const [intakeCount, setIntakeCount] = useState(0);

    useEffect(() => {
        setIntakeCount(getIntakeSummaries('user1').length);
    }, []);

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={24} style={{ color: 'white' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin Command Center</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Centralized oversight of all hospital subsystems</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', marginBottom: 12 }}>
                        <Users size={20} />
                        <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>ABHA Network</h3>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>{abhaDatabase.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Registered Patients</div>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', marginBottom: 12 }}>
                        <Activity size={20} />
                        <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>MediKiosk Logs</h3>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>{intakeCount}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total AI Summaries</div>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', marginBottom: 12 }}>
                        <Droplet size={20} />
                        <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Blood Bank</h3>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>174</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Units Available</div>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D97706', marginBottom: 12 }}>
                        <Building2 size={20} />
                        <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Hospital Capacity</h3>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>78%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Overall Occupancy</div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ServerCrash size={20} style={{ color: 'var(--text-primary)' }} /> System Health Monitor
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['ABHA Integration API', 'MediKiosk Voice Processing (Groq/OpenAI)', 'Blood Bank Inventory DB', 'Hospital Management System (HMS)'].map((sys, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                            <div style={{ fontWeight: 600 }}>{sys}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', boxShadow: '0 0 8px #059669' }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>ONLINE</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div style={{ padding: 24, background: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
                <strong>Admin Notice:</strong> This is a high-level command center. Detailed operations for admissions, blood requests, and clinical intakes should be handled through their respective specialized portals.
            </div>
        </div>
    );
}
