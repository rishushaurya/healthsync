'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { Droplet, MapPin, Bell, Clock, Edit, Save, Plus, Minus } from 'lucide-react';
import { getCurrentUser, getEmergencyRequests, updateEmergencyRequestStatus, type EmergencyRequest } from '@/lib/store';

// Mock Inventory Data
const INITIAL_INVENTORY = [
    { type: 'A+', count: 45, location: 'Central Hospital Wing A' },
    { type: 'A-', count: 12, location: 'Central Hospital Wing A' },
    { type: 'B+', count: 34, location: 'City Blood Center' },
    { type: 'B-', count: 8, location: 'City Blood Center' },
    { type: 'O+', count: 56, location: 'North District Hospital' },
    { type: 'O-', count: 4, location: 'North District Hospital' },
    { type: 'AB+', count: 15, location: 'South Clinic' },
    { type: 'AB-', count: 2, location: 'South Clinic' },
];

export default function BloodBankPortal() {
    const user = getCurrentUser();
    const [inventory, setInventory] = useState(INITIAL_INVENTORY);
    const [editMode, setEditMode] = useState(false);
    const [requests, setRequests] = useState<EmergencyRequest[]>([]);

    useEffect(() => {
        const load = () => {
            const allReqs = getEmergencyRequests();
            // Load live requests from store, plus some initial mock ones if store is empty
            const bloodReqs = allReqs.filter(r => r.type === 'blood');
            if (bloodReqs.length === 0) {
                setRequests([
                    { id: '1', type: 'blood', bloodType: 'O-', location: 'ICU Ward 4', status: 'Pending', time: '10 mins ago' } as any,
                    { id: '2', type: 'blood', bloodType: 'A+', location: 'Emergency Room', status: 'Dispatched', time: '1 hour ago' } as any
                ]);
            } else {
                setRequests(bloodReqs);
            }
        };
        load();
        window.addEventListener('storage', load);
        return () => window.removeEventListener('storage', load);
    }, []);
    
    const updateCount = (index: number, delta: number) => {
        const newInv = [...inventory];
        const val = newInv[index].count + delta;
        if (val >= 0) {
            newInv[index].count = val;
            setInventory(newInv);
        }
    };

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Droplet size={24} style={{ color: '#DC2626' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>Blood Bank Portal</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Live Inventory & Emergency Requests</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
                {/* Left Col: Inventory */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Live Inventory Availability</h2>
                        <button onClick={() => setEditMode(!editMode)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                            {editMode ? <><Save size={14} /> Save</> : <><Edit size={14} /> Edit Stock</>}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                        {inventory.map((item, i) => (
                            <div key={i} className="glass-card" style={{ padding: 16, textAlign: 'center', borderTop: item.count < 10 ? '3px solid #DC2626' : '3px solid #059669' }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{item.type}</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: item.count < 10 ? '#DC2626' : '#059669', margin: '8px 0' }}>
                                    {item.count} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>units</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <MapPin size={12} /> {item.location}
                                </div>

                                {editMode && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                        <button onClick={() => updateCount(i, -1)} style={{ padding: '6px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Minus size={16} /></button>
                                        <button onClick={() => updateCount(i, 1)} style={{ padding: '6px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Plus size={16} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Col: Notifications */}
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell size={18} style={{ color: '#D97706' }} /> Active Requests Inbox
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {requests.map((req) => (
                            <div key={req.id} className="glass-card" style={{ padding: 16, borderLeft: req.status === 'Pending' ? '4px solid #D97706' : '4px solid #059669' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{req.bloodType} <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Required</span></div>
                                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: req.status === 'Pending' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)', color: req.status === 'Pending' ? '#D97706' : '#059669' }}>
                                        {req.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                    <MapPin size={14} /> Deliver to: {req.location}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <Clock size={12} /> Requested {req.time}
                                </div>
                                
                                {req.status === 'Pending' && (
                                    <button 
                                        onClick={() => {
                                            updateEmergencyRequestStatus(req.id, 'Dispatched');
                                            setRequests(getEmergencyRequests().filter(r => r.type === 'blood'));
                                        }}
                                        style={{ width: '100%', marginTop: 12, padding: '8px', borderRadius: 6, background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Mark as Dispatched
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
