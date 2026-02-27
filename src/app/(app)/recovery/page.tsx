'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Circle, Clock, Pill, Utensils, Activity,
    Stethoscope, Plus, ArrowRight, CalendarDays, TrendingUp, Brain, X, Trash2, Loader2,
    ClipboardList, HeartPulse, Salad
} from 'lucide-react';
import { getJourneys, addJourney, updateJourney, setJourneys, generateId, getCurrentUser, type HealthJourney, type TimelineStep, type Medication, type DietItem, type Prescription } from '@/lib/store';
import { cloudGetPatientPrescriptions } from '@/lib/shared-store';

const typeIcons: Record<string, { icon: typeof CheckCircle; color: string }> = {
    checkup: { icon: Stethoscope, color: '#0EA5E9' },
    medication: { icon: Pill, color: '#8B5CF6' },
    diet: { icon: Utensils, color: '#10B981' },
    exercise: { icon: Activity, color: '#F59E0B' },
    lifestyle: { icon: TrendingUp, color: '#EC4899' },
};

export default function RecoveryPage() {
    const [journeys, setJourneysList] = useState<HealthJourney[]>([]);
    const [activeTab, setActiveTab] = useState<'timeline' | 'medications' | 'diet'>('timeline');
    const [showCreate, setShowCreate] = useState(false);
    const [showAddMed, setShowAddMed] = useState(false);
    const [condition, setCondition] = useState('');
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [medForm, setMedForm] = useState({ name: '', dosage: '', time: '8:00 AM' });
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

    useEffect(() => {
        setJourneysList(getJourneys());
        const user = getCurrentUser();
        if (user) {
            cloudGetPatientPrescriptions(user.id).then(presc => setPrescriptions(presc.filter(p => p.status === 'active')));
        }
    }, []);

    const activeJourney = journeys.find(j => j.status === 'active');
    const completed = activeJourney?.timeline.filter(s => s.status === 'completed').length || 0;
    const total = activeJourney?.timeline.length || 1;
    const progress = Math.round((completed / total) * 100);

    const generateRecoveryPlan = async () => {
        if (!condition.trim()) return;
        setGeneratingPlan(true);

        try {
            const user = getCurrentUser();
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `Create a detailed 14-day recovery plan for: ${condition}. 
                        
Return ONLY a valid JSON object with this exact structure:
{
  "title": "Recovery plan title",
  "timeline": [
    {"title": "Step title", "description": "What to do", "day": 1, "type": "checkup|medication|diet|exercise|lifestyle"}
  ],
  "medications": [
    {"name": "Medicine name", "dosage": "500mg", "time": ["8:00 AM", "8:00 PM"]}
  ],
  "dietPlan": [
    {"meal": "Breakfast|Lunch|Snack|Dinner", "items": ["food1", "food2"], "calories": 350, "time": "8:00 AM"}
  ]
}

Include 6-10 timeline steps, relevant medications, and a full diet plan with 4 meals. Focus on Indian dietary preferences. Do not include any markdown formatting, only the JSON object.`
                    }],
                    systemPrompt: 'You are a medical recovery plan generator. Return ONLY valid JSON, no markdown, no explanation.',
                    userContext: user ? { profile: user } : undefined,
                }),
            });

            const data = await res.json();
            let plan;
            try {
                const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
            } catch {
                plan = null;
            }

            if (plan) {
                const journey: HealthJourney = {
                    id: generateId(),
                    userId: 'current',
                    title: plan.title || `${condition} Recovery`,
                    condition,
                    status: 'active',
                    triageLevel: 'amber',
                    progress: 0,
                    startDate: new Date().toISOString(),
                    timeline: (plan.timeline || []).map((s: { title: string; description: string; day: number; type: string }, i: number) => ({
                        id: generateId(),
                        title: s.title,
                        description: s.description,
                        day: s.day || i + 1,
                        status: 'pending' as const,
                        type: s.type || 'lifestyle',
                    })),
                    medications: (plan.medications || []).map((m: { name: string; dosage: string; time: string[] }) => ({
                        id: generateId(),
                        name: m.name,
                        dosage: m.dosage,
                        frequency: 'daily',
                        time: m.time || ['8:00 AM'],
                        taken: (m.time || ['8:00 AM']).map(() => false),
                    })),
                    dietPlan: (plan.dietPlan || []).map((d: { meal: string; items: string[]; calories: number; time: string }) => ({
                        id: generateId(),
                        meal: d.meal,
                        items: d.items,
                        calories: d.calories,
                        time: d.time,
                    })),
                    doctorNotes: '',
                    aiSummary: `AI-generated recovery plan for ${condition}`,
                    verified: false,
                };

                // Deactivate other journeys
                const updated: HealthJourney[] = journeys.map(j => ({ ...j, status: 'paused' as HealthJourney['status'] }));
                updated.push(journey);
                setJourneys(updated);
                setJourneysList(updated);
                setShowCreate(false);
                setCondition('');
            }
        } catch {
            alert('Failed to generate plan. Please try again.');
        }
        setGeneratingPlan(false);
    };

    const toggleStepStatus = (stepId: string) => {
        if (!activeJourney) return;
        const updated = {
            ...activeJourney,
            timeline: activeJourney.timeline.map(s =>
                s.id === stepId ? { ...s, status: (s.status === 'completed' ? 'pending' : 'completed') as TimelineStep['status'] } : s
            ),
        };
        updateJourney(activeJourney.id, updated);
        setJourneysList(getJourneys());
    };

    const addMedication = () => {
        if (!activeJourney || !medForm.name) return;
        const newMed: Medication = {
            id: generateId(),
            name: medForm.name,
            dosage: medForm.dosage,
            frequency: 'daily',
            time: [medForm.time],
            taken: [false],
        };
        const updated = {
            ...activeJourney,
            medications: [...(activeJourney.medications || []), newMed],
        };
        updateJourney(activeJourney.id, updated);
        setJourneysList(getJourneys());
        setShowAddMed(false);
        setMedForm({ name: '', dosage: '', time: '8:00 AM' });
    };

    const toggleMedTaken = (medId: string, timeIdx: number) => {
        if (!activeJourney) return;
        const updated = {
            ...activeJourney,
            medications: (activeJourney.medications || []).map(m =>
                m.id === medId ? { ...m, taken: m.taken.map((t, i) => i === timeIdx ? !t : t) } : m
            ),
        };
        updateJourney(activeJourney.id, updated);
        setJourneysList(getJourneys());
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><HeartPulse size={28} style={{ color: 'var(--color-primary)' }} /> Recovery Command Center</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Track your journey to recovery step by step</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {activeJourney && (
                        <button onClick={() => {
                            if (confirm('Are you sure you want to clear the active recovery plan?')) {
                                const updated = journeys.map(j => j.id === activeJourney.id ? { ...j, status: 'completed' as HealthJourney['status'] } : j);
                                setJourneys(updated);
                                setJourneysList(updated);
                            }
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444' }}>
                            <Trash2 size={16} /> Clear Plan
                        </button>
                    )}
                    <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={18} /> New Plan
                    </button>
                </div>
            </div>

            {/* No journey placeholder */}
            {!activeJourney && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 60, textAlign: 'center' }}>
                    <Brain size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, opacity: 0.5 }} />
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Active Recovery Plan</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Tell AI your condition and it will create a customized plan.</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary">
                        <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Create Recovery Plan
                    </button>
                </motion.div>
            )}

            {/* Journey Header */}
            {activeJourney && (
                <>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700 }}>{activeJourney.title}</h2>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{activeJourney.condition}</span>
                            </div>
                            <span className={`status-badge ${activeJourney.verified ? 'status-verified' : 'status-pending'}`}>
                                {activeJourney.verified ? '✓ Verified' : '⏳ Pending Verification'}
                            </span>
                        </div>
                        <div className="progress-bar" style={{ marginBottom: 8 }}>
                            <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                            <span>{progress}% complete • Day {Math.ceil((Date.now() - new Date(activeJourney.startDate).getTime()) / 86400000)}</span>
                            <span>{completed}/{total} steps done</span>
                        </div>
                    </motion.div>

                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 14, padding: 4, marginBottom: 24 }}>
                        {([
                            { key: 'timeline', label: 'Timeline' },
                            { key: 'medications', label: 'Medications' },
                            { key: 'diet', label: 'Diet Plan' },
                        ] as const).map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                                flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                                background: activeTab === tab.key ? 'var(--gradient-primary)' : 'transparent',
                                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                                fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.3s ease',
                            }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Timeline View */}
                    {activeTab === 'timeline' && (
                        <div style={{ position: 'relative', paddingLeft: 40 }}>
                            <div className="timeline-line" />
                            {activeJourney.timeline.map((step, i) => {
                                const typeInfo = typeIcons[step.type] || typeIcons.lifestyle;
                                const Icon = typeInfo.icon;
                                return (
                                    <motion.div key={step.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} style={{ position: 'relative', marginBottom: 20, paddingLeft: 24 }}>
                                        <div style={{ position: 'absolute', left: -27 }}>
                                            <div className={`timeline-dot ${step.status}`} />
                                        </div>
                                        <div className="glass-card" onClick={() => toggleStepStatus(step.id)} style={{
                                            padding: 18, cursor: 'pointer',
                                            opacity: step.status === 'pending' ? 0.7 : 1,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${typeInfo.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Icon size={16} style={{ color: typeInfo.color }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 15, textDecoration: step.status === 'completed' ? 'line-through' : 'none' }}>{step.title}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Day {step.day}</div>
                                                    </div>
                                                </div>
                                                <span className={`status-badge status-${step.status}`}>
                                                    {step.status === 'completed' ? '✓ Done' : step.status === 'active' ? '● Active' : '○ Pending'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.description}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Medications View */}
                    {activeTab === 'medications' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {(activeJourney.medications || []).length === 0 && (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Pill size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                    <p>No medications added yet.</p>
                                </div>
                            )}
                            {(activeJourney.medications || []).map((med, i) => (
                                <motion.div key={med.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass-card" style={{ padding: 18 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            {med.time.map((t, ti) => (
                                                <button key={ti} onClick={() => toggleMedTaken(med.id, ti)} style={{
                                                    width: 28, height: 28, borderRadius: 8,
                                                    border: `2px solid ${med.taken[ti] ? '#10B981' : 'var(--border-color)'}`,
                                                    background: med.taken[ti] ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                }}>
                                                    {med.taken[ti] && <CheckCircle size={16} style={{ color: '#10B981' }} />}
                                                </button>
                                            ))}
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 15 }}>{med.name} {med.dosage}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{med.time.join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            <button onClick={() => setShowAddMed(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Plus size={16} /> Add Medication
                            </button>
                        </div>
                    )}

                    {/* Diet Plan View */}
                    {activeTab === 'diet' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {(activeJourney.dietPlan || []).length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Utensils size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                    <p>Diet plan will be generated with your recovery plan.</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        padding: '12px 16px', borderRadius: 12,
                                        background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.12)',
                                        fontSize: 14, color: 'var(--text-secondary)',
                                    }}>
                                        AI-personalized diet plan for your condition.
                                        Total: <strong>{(activeJourney.dietPlan || []).reduce((a, m) => a + (m.calories || 0), 0)} cal/day</strong>
                                    </div>
                                    {(activeJourney.dietPlan || []).map((meal, i) => (
                                        <motion.div key={meal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Utensils size={16} style={{ color: '#10B981' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{meal.meal}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meal.time}</div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>{meal.calories} cal</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {meal.items.map((item, j) => (
                                                    <span key={j} style={{
                                                        padding: '4px 12px', borderRadius: 8,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        fontSize: 13, color: 'var(--text-secondary)',
                                                    }}>
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create Plan Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 20, backdropFilter: 'blur(4px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card-static" style={{ padding: 32, width: '100%', maxWidth: 440 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Recovery Plan</h2>
                                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                Tell AI your condition and it will generate a full recovery plan with timeline, medications, and diet.
                            </p>
                            {prescriptions.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Or generate from your active prescriptions:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {prescriptions.map(rx => (
                                            <button key={rx.id} onClick={() => {
                                                const medList = rx.medicines.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join(', ');
                                                setCondition(`Recovery plan based on prescription for ${rx.diagnosis} by ${rx.doctorName}. Prescribed medicines: ${medList}. ${rx.advice ? 'Doctor advice: ' + rx.advice : ''}`);
                                            }} style={{
                                                padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)',
                                                background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                                                display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
                                            }}>
                                                <ClipboardList size={16} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{rx.diagnosis}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {rx.doctorName} - {rx.medicines.length} medicine(s)</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <textarea className="input-field" placeholder="e.g., Kidney stone removal recovery, Post ACL surgery, Diabetes management..." value={condition} onChange={e => setCondition(e.target.value)} rows={3} style={{ resize: 'vertical', marginBottom: 16 }} />
                            <button onClick={generateRecoveryPlan} disabled={generatingPlan || !condition.trim()} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generatingPlan || !condition.trim() ? 0.6 : 1 }}>
                                {generatingPlan ? (
                                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> Generating...</>
                                ) : (
                                    <><Brain size={16} /> Generate Plan with AI</>
                                )}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Medication Modal */}
            <AnimatePresence>
                {showAddMed && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 20, backdropFilter: 'blur(4px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card-static" style={{ padding: 32, width: '100%', maxWidth: 400 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add Medication</h2>
                                <button onClick={() => setShowAddMed(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <input className="input-field" placeholder="Medicine name" value={medForm.name} onChange={e => setMedForm(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 12 }} />
                            <input className="input-field" placeholder="Dosage (e.g., 500mg)" value={medForm.dosage} onChange={e => setMedForm(p => ({ ...p, dosage: e.target.value }))} style={{ marginBottom: 12 }} />
                            <select className="input-field" value={medForm.time} onChange={e => setMedForm(p => ({ ...p, time: e.target.value }))} style={{ marginBottom: 16 }}>
                                {['6:00 AM', '8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '6:00 PM', '8:00 PM', '10:00 PM'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn-primary" onClick={addMedication} style={{ flex: 1 }}>Add</button>
                                <button className="btn-secondary" onClick={() => setShowAddMed(false)} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
