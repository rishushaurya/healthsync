'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Phone, MapPin, Heart, AlertTriangle, User, X, Shield, Edit2 } from 'lucide-react';
import { getFamilyMembers, addFamilyMember, generateId, getCurrentUser, type FamilyMember } from '@/lib/store';

export default function FamilyPage() {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', relation: '', age: '', emergencyContact: '', conditions: '' });

    useEffect(() => {
        setMembers(getFamilyMembers());
    }, []);

    const handleAdd = () => {
        const member: FamilyMember = {
            id: generateId(),
            userId: getCurrentUser()?.id || 'unknown',
            name: newMember.name,
            relation: newMember.relation,
            age: newMember.age,
            conditions: newMember.conditions.split(',').map(c => c.trim()).filter(Boolean),
            emergencyContact: newMember.emergencyContact,
        };
        addFamilyMember(member);
        setMembers(prev => [...prev, member]);
        setShowAdd(false);
        setNewMember({ name: '', relation: '', age: '', emergencyContact: '', conditions: '' });
    };


    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>Family Health Tree</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Manage health profiles for your entire family</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={18} /> Add Member
                </button>
            </div>

            {/* Emergency SOS Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{
                    padding: 20, borderRadius: 16, marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <AlertTriangle size={24} style={{ color: '#EF4444' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Emergency SOS</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Alerts all family members with your location & Medical ID
                            </div>
                        </div>
                    </div>
                    <button className="btn-danger" style={{ padding: '10px 24px' }}>
                        SOS
                    </button>
                </div>
            </motion.div>

            {/* Family Tree Visual */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {members.map((member, i) => (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card"
                        style={{ padding: 22 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 50, height: 50, borderRadius: '50%',
                                    background: 'var(--gradient-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24,
                                }}>
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>{member.name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--color-primary)' }}>{member.relation} • Age {member.age}</div>
                                </div>
                            </div>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Edit2 size={16} />
                            </button>
                        </div>

                        {member.conditions.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Conditions</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {member.conditions.map((c, j) => (
                                        <span key={j} style={{
                                            padding: '4px 10px', borderRadius: 8, fontSize: 12,
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                            color: '#F59E0B', fontWeight: 500,
                                        }}>
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                            <Phone size={13} /> {member.emergencyContact}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                            <button className="btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Heart size={14} /> Health Timeline
                            </button>
                            <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }}>
                                <Shield size={14} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Add Member Modal */}
            {showAdd && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1001, padding: 20, backdropFilter: 'blur(4px)',
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-card-static"
                        style={{ padding: 32, width: '100%', maxWidth: 440 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add Family Member</h2>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <input className="input-field" placeholder="Full Name" value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} />
                            <select className="input-field" value={newMember.relation} onChange={e => setNewMember(p => ({ ...p, relation: e.target.value }))}>
                                <option value="">Select Relation</option>
                                {Object.keys({ 'Self': 1, 'Mother': 1, 'Father': 1, 'Wife': 1, 'Husband': 1, 'Son': 1, 'Daughter': 1, 'Brother': 1, 'Sister': 1, 'Grandfather': 1, 'Grandmother': 1 }).filter(r => r !== 'Self').map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <input className="input-field" placeholder="Age" type="number" value={newMember.age} onChange={e => setNewMember(p => ({ ...p, age: e.target.value }))} />
                            <input className="input-field" placeholder="Emergency Contact" value={newMember.emergencyContact} onChange={e => setNewMember(p => ({ ...p, emergencyContact: e.target.value }))} />
                            <input className="input-field" placeholder="Conditions (comma separated)" value={newMember.conditions} onChange={e => setNewMember(p => ({ ...p, conditions: e.target.value }))} />
                            <button className="btn-primary" onClick={handleAdd} style={{ marginTop: 8 }}>
                                <Plus size={16} /> Add Member
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
