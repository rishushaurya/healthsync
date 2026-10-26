'use client';

import { useEffect, useState } from 'react';
import { Building2, Activity, BedSingle, Users, Edit, Save, Plus, Minus, Package } from 'lucide-react';
import { PLATFORM_DOCTORS } from '@/lib/data';
import { getEmergencyRequests, updateEmergencyRequestStatus, type EmergencyRequest, getAllOrders, updateOrderStatus, type MedicineOrder } from '@/lib/store';

const INITIAL_ROOMS = [
    { type: 'ICU', total: 20, occupied: 18, color: '#DC2626' },
    { type: 'Normal Ward', total: 50, occupied: 30, color: '#3B82F6' },
    { type: 'General Ward', total: 100, occupied: 85, color: '#059669' },
];

const INITIAL_MACHINES = [
    { type: 'MRI Scanner', total: 3, occupied: 2, status: 'Operational' },
    { type: 'CT Scanner', total: 4, occupied: 4, status: 'Fully Booked' },
    { type: 'X-Ray (Digital)', total: 6, occupied: 2, status: 'Available' },
    { type: 'Ultrasound', total: 8, occupied: 5, status: 'Available' },
];

export default function HospitalPortal() {
    const [rooms, setRooms] = useState(INITIAL_ROOMS);
    const [machines, setMachines] = useState(INITIAL_MACHINES);
    const [editMode, setEditMode] = useState(false);
    const [bedRequests, setBedRequests] = useState<EmergencyRequest[]>([]);
    const [machineRequests, setMachineRequests] = useState<EmergencyRequest[]>([]);
    const [pharmacyOrders, setPharmacyOrders] = useState<MedicineOrder[]>([]);

    useEffect(() => {
        const load = () => {
            const allReqs = getEmergencyRequests();
            const beds = allReqs.filter(r => r.type === 'bed');
            const machines = allReqs.filter(r => r.type === 'machine');
            
            if (beds.length === 0) {
                setBedRequests([{ id: '1', type: 'bed', patientName: 'Rajesh Kumar', ward: 'ICU', status: 'Admitted' } as any]);
            } else {
                setBedRequests(beds);
            }
            
            setMachineRequests(machines);
            setPharmacyOrders(getAllOrders());
        };
        load();
        window.addEventListener('storage', load);
        return () => window.removeEventListener('storage', load);
    }, []);

    const updateRoom = (index: number, field: 'total' | 'occupied', delta: number) => {
        const newRooms = [...rooms];
        const val = newRooms[index][field] + delta;
        if (val >= 0) {
            newRooms[index][field] = val;
            setRooms(newRooms);
        }
    };

    const updateMachine = (index: number, field: 'total' | 'occupied', delta: number) => {
        const newMachines = [...machines];
        const val = newMachines[index][field] + delta;
        if (val >= 0) {
            newMachines[index][field] = val;
            if (field === 'occupied' || field === 'total') {
                const available = newMachines[index].total - newMachines[index].occupied;
                newMachines[index].status = available === 0 ? 'Fully Booked' : 'Available';
            }
            setMachines(newMachines);
        }
    };

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={24} style={{ color: '#3B82F6' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>Hospital Administration Portal</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Resource Management & Admissions</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
                {/* Left Col: Rooms & Doctors */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BedSingle size={20} style={{ color: '#3B82F6' }} /> Room Availability
                        </h2>
                        <button onClick={() => setEditMode(!editMode)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                            {editMode ? <><Save size={14} /> Save</> : <><Edit size={14} /> Edit Data</>}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                        {rooms.map((room, i) => {
                            const available = room.total - room.occupied;
                            const percent = (room.occupied / room.total) * 100;
                            return (
                                <div key={i} className="glass-card" style={{ padding: 20 }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{room.type}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: available < 5 ? '#DC2626' : room.color }}>
                                            {available} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>available</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{room.total} total</div>
                                    </div>
                                    <div className="progress-bar" style={{ marginBottom: 12 }}>
                                        <div className="progress-fill" style={{ width: `${percent}%`, background: percent > 90 ? '#DC2626' : room.color }} />
                                    </div>

                                    {editMode && (
                                        <div style={{ display: 'grid', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>Total</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => updateRoom(i, 'total', -1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Minus size={14} /></button>
                                                    <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{room.total}</span>
                                                    <button onClick={() => updateRoom(i, 'total', 1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Plus size={14} /></button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>Occupied</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => updateRoom(i, 'occupied', -1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Minus size={14} /></button>
                                                    <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{room.occupied}</span>
                                                    <button onClick={() => updateRoom(i, 'occupied', 1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Plus size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={20} style={{ color: '#4F6B8A' }} /> Diagnostic Machines Status
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                        {machines.map((mach, i) => {
                            const available = mach.total - mach.occupied;
                            return (
                                <div key={i} className="glass-card" style={{ padding: 16, borderLeft: available === 0 ? '4px solid #DC2626' : '4px solid #059669' }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{mach.type}</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: available === 0 ? '#DC2626' : '#059669' }}>
                                        {available} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>available</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{mach.status}</div>

                                    {editMode && (
                                        <div style={{ display: 'grid', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>Total</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => updateMachine(i, 'total', -1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Minus size={14} /></button>
                                                    <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{mach.total}</span>
                                                    <button onClick={() => updateMachine(i, 'total', 1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Plus size={14} /></button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>Occupied</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => updateMachine(i, 'occupied', -1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Minus size={14} /></button>
                                                    <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{mach.occupied}</span>
                                                    <button onClick={() => updateMachine(i, 'occupied', 1)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}><Plus size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={20} style={{ color: '#059669' }} /> Available Doctors on Duty
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {PLATFORM_DOCTORS.map((doc) => (
                            <div key={doc.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                    {doc.name.charAt(4)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{doc.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.specialty} • {doc.type}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: '#059669' }} title="On Duty" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Col: Admissions Inbox */}
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BedSingle size={20} style={{ color: '#D97706' }} /> Active Admission Requests
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                        {bedRequests.map(adm => (
                            <div key={adm.id} className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{adm.patientName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{adm.ward}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: adm.status === 'Processing' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)', color: adm.status === 'Processing' ? '#D97706' : '#059669' }}>
                                        {adm.status}
                                    </span>
                                    {adm.status === 'Processing' && (
                                        <button 
                                            onClick={() => {
                                                updateEmergencyRequestStatus(adm.id, 'Admitted');
                                                setBedRequests(getEmergencyRequests().filter(r => r.type === 'bed'));
                                            }}
                                            style={{ padding: '4px 8px', fontSize: 12, background: '#059669', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                                        >
                                            Admit
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={20} style={{ color: '#3B82F6' }} /> Machine Scan Requests
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {machineRequests.map(req => (
                            <div key={req.id} className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{req.patientName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{req.machine}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: req.status === 'Pending' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)', color: req.status === 'Pending' ? '#D97706' : '#059669' }}>
                                        {req.status}
                                    </span>
                                    {req.status === 'Pending' && (
                                        <button 
                                            onClick={() => {
                                                updateEmergencyRequestStatus(req.id, 'Completed');
                                                setMachineRequests(getEmergencyRequests().filter(r => r.type === 'machine'));
                                            }}
                                            style={{ padding: '4px 8px', fontSize: 12, background: '#059669', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                                        >
                                            Confirm
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {machineRequests.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active machine requests.</p>}
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '32px 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Package size={20} style={{ color: '#4F6B8A' }} /> Pharmacy Orders
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pharmacyOrders.map(order => (
                            <div key={order.id} className="glass-card" style={{ padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{order.transactionId}</div>
                                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: order.status === 'delivered' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(79, 107, 138, 0.1)', color: order.status === 'delivered' ? '#059669' : '#4F6B8A' }}>
                                        {order.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                    {order.items.length} items • ₹{order.totalAmount}
                                </div>
                                {order.status === 'confirmed' && (
                                    <button 
                                        onClick={() => {
                                            updateOrderStatus(order.id, order.userId, 'shipped');
                                            setPharmacyOrders(getAllOrders());
                                        }}
                                        style={{ width: '100%', padding: '6px', fontSize: 12, background: '#4F6B8A', color: 'white', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Mark as Shipped
                                    </button>
                                )}
                                {order.status === 'shipped' && (
                                    <button 
                                        onClick={() => {
                                            updateOrderStatus(order.id, order.userId, 'delivered');
                                            setPharmacyOrders(getAllOrders());
                                        }}
                                        style={{ width: '100%', padding: '6px', fontSize: 12, background: '#059669', color: 'white', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Mark as Delivered
                                    </button>
                                )}
                            </div>
                        ))}
                        {pharmacyOrders.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No pending pharmacy orders.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
