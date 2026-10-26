'use client';

import { useEffect, useState } from 'react';
import { Leaf, Users, Calendar, Package, Activity, Clock, Edit, Save, Plus, Minus } from 'lucide-react';
import { getAllAppointments, getAllOrders, type Appointment, type MedicineOrder } from '@/lib/store';
import { PLATFORM_DOCTORS } from '@/lib/data';

const AYURVEDIC_MEDS = ['Ashwagandha', 'Triphala Churna', 'Giloy Ghanvati', 'Brahmi Vati', 'Chyawanprash'];

const INITIAL_INVENTORY = [
    { name: 'Ashwagandha', total: 500, price: 80 },
    { name: 'Triphala Churna', total: 300, price: 60 },
    { name: 'Giloy Ghanvati', total: 200, price: 70 },
    { name: 'Brahmi Vati', total: 150, price: 90 },
    { name: 'Chyawanprash', total: 100, price: 150 },
];

export default function AyushAdminDashboard() {
    const [ayurvedicApts, setAyurvedicApts] = useState<(Appointment & { patientName: string; patientEmail: string })[]>([]);
    const [ayurvedicOrders, setAyurvedicOrders] = useState<MedicineOrder[]>([]);
    const [inventory, setInventory] = useState(INITIAL_INVENTORY);
    const [editMode, setEditMode] = useState(false);
    
    const updateInventory = (index: number, delta: number) => {
        const newInv = [...inventory];
        if (newInv[index].total + delta >= 0) {
            newInv[index].total += delta;
            setInventory(newInv);
        }
    };

    useEffect(() => {
        // Fetch all appointments across the system
        const allApts = getAllAppointments();
        
        // Find which doctors are Ayurvedic
        const ayurvedicDoctorIds = new Set(PLATFORM_DOCTORS.filter(d => d.type === 'Ayurvedic').map(d => d.id));
        
        // Filter appointments for those doctors
        setAyurvedicApts(allApts.filter(a => ayurvedicDoctorIds.has(a.doctorId)));

        // Fetch all medicine orders
        const allOrders = getAllOrders();
        
        // Filter orders that contain at least one Ayurvedic medicine
        setAyurvedicOrders(allOrders.filter(o => o.items.some(i => AYURVEDIC_MEDS.includes(i.name))));
    }, []);

    return (
        <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Leaf size={32} style={{ color: '#059669' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>Ayush Ministry Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Centralized Monitoring for Traditional Medicine</p>
                </div>
            </div>

            {/* High level metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
                <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{ayurvedicApts.length}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Consultations</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{ayurvedicOrders.reduce((acc, curr) => acc + curr.items.filter(i => AYURVEDIC_MEDS.includes(i.name)).reduce((a, c) => a + c.quantity, 0), 0)}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ayurvedic Medicines Dispensed</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{PLATFORM_DOCTORS.filter(doc => doc.type === 'Ayurvedic').length}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Active Vaidyas</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32 }}>
                
                {/* Left Column: Vaidyas & Inventory */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={20} style={{ color: '#059669' }} /> Ayurvedic Medicines Inventory
                        </h2>
                        <button onClick={() => setEditMode(!editMode)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                            {editMode ? <><Save size={14} /> Save</> : <><Edit size={14} /> Edit Data</>}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
                        {inventory.map((item, i) => (
                            <div key={item.name} className="glass-card" style={{ padding: 16 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{item.name}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: item.total < 50 ? '#DC2626' : '#059669' }}>
                                    {item.total} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>units</span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>₹{item.price} per unit</div>
                                
                                {editMode && (
                                    <div style={{ display: 'grid', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>Stock</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => updateInventory(i, -10)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Minus size={14} /></button>
                                                <span style={{ width: 36, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{item.total}</span>
                                                <button onClick={() => updateInventory(i, 10)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Plus size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={20} style={{ color: '#D97706' }} /> Available Vaidyas on Duty
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {PLATFORM_DOCTORS.filter(doc => doc.type === 'Ayurvedic').map((doc) => (
                            <div key={doc.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                    {doc.name.charAt(4)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{doc.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.specialty}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: '#059669' }} title="On Duty" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Consultations & Orders */}
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={20} style={{ color: '#3B82F6' }} /> Recent Ayurvedic Consultations
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {ayurvedicApts.map(apt => (
                            <div key={apt.id} className="glass-card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 700 }}>{apt.patientName}</div>
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontWeight: 600 }}>
                                        {apt.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
                                    Consulting: {apt.doctorName}
                                </div>
                                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {apt.date}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {apt.time}</span>
                                </div>
                            </div>
                        ))}
                        {ayurvedicApts.length === 0 && (
                            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                No Ayurvedic consultations booked yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Pharmacy Orders */}
                <div style={{ marginTop: 32 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Leaf size={20} style={{ color: '#059669' }} /> Ayurvedic Pharmacy Orders
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {ayurvedicOrders.map(order => (
                            <div key={order.id} className="glass-card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 700 }}>Order {order.transactionId}</div>
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontWeight: 600 }}>
                                        {order.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    Total Value: ₹{order.totalAmount}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Ayurvedic Items:</div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                    {order.items.filter(i => AYURVEDIC_MEDS.includes(i.name)).map(item => (
                                        <li key={item.name}>{item.quantity}x {item.name}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        {ayurvedicOrders.length === 0 && (
                            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                No Ayurvedic medicine orders found.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
