'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Droplets, Thermometer, Activity, TrendingUp, Plus, Scale, X, Trash2, Clock, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getVitals, addVital, generateId, addNotification, getCurrentUser, type Vital } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';

const vitalTypes = [
    { type: 'bp', label: 'Blood Pressure', unit: 'mmHg', icon: Heart, color: '#EF4444', placeholder: '120/80' },
    { type: 'sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplets, color: '#0EA5E9', placeholder: '95' },
    { type: 'temperature', label: 'Temperature', unit: '\u00B0F', icon: Thermometer, color: '#F59E0B', placeholder: '98.6' },
    { type: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: Activity, color: '#8B5CF6', placeholder: '72' },
    { type: 'spo2', label: 'SpO2', unit: '%', icon: TrendingUp, color: '#10B981', placeholder: '98' },
    { type: 'weight', label: 'Weight', unit: 'kg', icon: Scale, color: '#EC4899', placeholder: '70' },
];

function getStatus(type: string, value: string): { text: string; color: string } {
    const v = parseFloat(value);
    if (isNaN(v)) return { text: 'No data', color: 'var(--text-muted)' };
    switch (type) {
        case 'bp': {
            const parts = value.split('/');
            const sys = parseFloat(parts[0]);
            if (sys > 140) return { text: 'High', color: '#EF4444' };
            if (sys < 90) return { text: 'Low', color: '#F59E0B' };
            return { text: 'Normal', color: '#10B981' };
        }
        case 'sugar': return v > 126 ? { text: 'High', color: '#EF4444' } : v < 70 ? { text: 'Low', color: '#F59E0B' } : { text: 'Normal', color: '#10B981' };
        case 'heartRate': return v > 100 ? { text: 'High', color: '#EF4444' } : v < 60 ? { text: 'Low', color: '#F59E0B' } : { text: 'Normal', color: '#10B981' };
        case 'spo2': return v < 95 ? { text: 'Low', color: '#EF4444' } : { text: 'Normal', color: '#10B981' };
        case 'temperature': return v > 100 ? { text: 'Fever', color: '#EF4444' } : v < 97 ? { text: 'Low', color: '#F59E0B' } : { text: 'Normal', color: '#10B981' };
        default: return { text: 'Stable', color: '#10B981' };
    }
}

export default function VitalsPage() {
    const { t } = useLanguage();
    const [showLog, setShowLog] = useState(false);
    const [logType, setLogType] = useState('bp');
    const [logValue, setLogValue] = useState('');
    const [activeChart, setActiveChart] = useState('bp');
    const [vitals, setVitalsList] = useState<Vital[]>([]);
    const [justAdded, setJustAdded] = useState<string | null>(null);

    useEffect(() => {
        setVitalsList(getVitals());
    }, []);

    const getLatestValue = (type: string): string => {
        const typeVitals = vitals.filter(v => v.type === type);
        if (typeVitals.length === 0) return '--';
        return typeVitals[typeVitals.length - 1].value;
    };

    const getChartData = (type: string) => {
        const typeVitals = vitals.filter(v => v.type === type).slice(-14);
        if (typeVitals.length === 0) return [];
        return typeVitals.map(v => {
            const date = new Date(v.date).toLocaleDateString('en', { weekday: 'short' });
            if (type === 'bp') {
                const parts = v.value.split('/');
                return { date, systolic: parseFloat(parts[0]) || 0, diastolic: parseFloat(parts[1]) || 0 };
            }
            return { date, value: parseFloat(v.value) || 0 };
        });
    };

    const handleLog = () => {
        if (!logValue.trim()) return;
        const vital: Vital = {
            id: generateId(),
            userId: 'current',
            type: logType as Vital['type'],
            value: logValue.trim(),
            unit: vitalTypes.find(v => v.type === logType)?.unit || '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
        };
        addVital(vital);
        setVitalsList(getVitals());
        setShowLog(false);
        setLogValue('');
        setJustAdded(logType);
        setTimeout(() => setJustAdded(null), 2000);

        // Send notification for abnormal values
        const status = getStatus(logType, logValue.trim());
        if (status.text !== 'Normal' && status.text !== 'Stable' && status.text !== 'No data') {
            const user = getCurrentUser();
            if (user) {
                addNotification({
                    id: generateId(), userId: user.id, type: 'system',
                    title: `Abnormal ${vitalTypes.find(v => v.type === logType)?.label} Detected`,
                    message: `Your ${vitalTypes.find(v => v.type === logType)?.label} reading of ${logValue.trim()} ${vitalTypes.find(v => v.type === logType)?.unit} is ${status.text.toLowerCase()}. Please consult your doctor if this persists.`,
                    timestamp: new Date().toISOString(), read: false,
                });
            }
        }
    };

    const quickAdd = (type: string) => {
        setLogType(type);
        setShowLog(true);
        setLogValue('');
    };

    const recentEntries = vitals.slice(-6).reverse();
    const chartData = getChartData(activeChart);

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('vitals.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Monitor your health metrics daily</p>
                </div>
                <button onClick={() => { setShowLog(true); setLogType('bp'); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={18} /> Log Vitals
                </button>
            </div>

            {/* Vital Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
                {vitalTypes.map((vital, i) => {
                    const Icon = vital.icon;
                    const latestVal = getLatestValue(vital.type);
                    const status = getStatus(vital.type, latestVal);
                    return (
                        <motion.div
                            key={vital.type}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.06 }}
                            className="glass-card"
                            style={{
                                padding: 18, cursor: 'pointer', textAlign: 'center',
                                outline: activeChart === vital.type ? `2px solid ${vital.color}` : 'none',
                                position: 'relative',
                            }}
                        >
                            <div onClick={() => setActiveChart(vital.type)}>
                                <Icon size={22} style={{ color: vital.color, marginBottom: 8 }} />
                                <div style={{ fontSize: 24, fontWeight: 800 }}>{latestVal}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{vital.unit}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{vital.label}</div>
                                <span style={{
                                    display: 'inline-block', marginTop: 6,
                                    padding: '2px 10px', borderRadius: 10,
                                    background: `${status.color}15`,
                                    color: status.color, fontSize: 11, fontWeight: 600,
                                }}>
                                    {status.text}
                                </span>
                            </div>
                            {/* Quick add button */}
                            <button onClick={(e) => { e.stopPropagation(); quickAdd(vital.type); }} style={{
                                position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8,
                                background: `${vital.color}10`, border: `1px solid ${vital.color}30`,
                                color: vital.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
                            }}>
                                <Plus size={14} />
                            </button>
                            {/* Just added indicator */}
                            <AnimatePresence>
                                {justAdded === vital.type && (
                                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                                        style={{
                                            position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%',
                                            background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                        <CheckCircle size={14} style={{ color: 'white' }} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
                    {vitalTypes.find(v => v.type === activeChart)?.label} Trend
                </h3>
                {chartData.length > 0 ? (
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {activeChart === 'bp' ? (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="bpGrad1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="bpGrad2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                                    <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12 }} />
                                    <Area type="monotone" dataKey="systolic" stroke="#EF4444" fill="url(#bpGrad1)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="diastolic" stroke="#0EA5E9" fill="url(#bpGrad2)" strokeWidth={2} />
                                </AreaChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="vitalGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={vitalTypes.find(v => v.type === activeChart)?.color || '#0EA5E9'} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={vitalTypes.find(v => v.type === activeChart)?.color || '#0EA5E9'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                                    <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12 }} />
                                    <Area type="monotone" dataKey="value" stroke={vitalTypes.find(v => v.type === activeChart)?.color} fill="url(#vitalGrad)" strokeWidth={2} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No data yet. Log your vitals to see trends.</p>
                    </div>
                )}
            </motion.div>

            {/* Recent Entries */}
            {recentEntries.length > 0 && (
                <div className="glass-card-static" style={{ padding: 20, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} style={{ color: 'var(--text-muted)' }} /> Recent Entries
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentEntries.map(v => {
                            const vType = vitalTypes.find(vt => vt.type === v.type);
                            const status = getStatus(v.type, v.value);
                            const Icon = vType?.icon || Heart;
                            return (
                                <div key={v.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                    borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${vType?.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon size={16} style={{ color: vType?.color }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{vType?.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.date} at {v.time}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>{v.value} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.unit}</span></div>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: status.color }}>{status.text}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Log Modal */}
            <AnimatePresence>
                {showLog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1001, padding: 20, backdropFilter: 'blur(4px)',
                    }} onClick={(e) => { if (e.target === e.currentTarget) setShowLog(false); }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card-static" style={{ padding: 32, width: '100%', maxWidth: 400 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Log Vital</h2>
                                <button onClick={() => setShowLog(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Quick type selector */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                                {vitalTypes.map(v => {
                                    const Icon = v.icon;
                                    return (
                                        <button key={v.type} onClick={() => { setLogType(v.type); setLogValue(''); }}
                                            style={{
                                                padding: '12px 8px', borderRadius: 12, border: `2px solid ${logType === v.type ? v.color : 'var(--border-color)'}`,
                                                background: logType === v.type ? `${v.color}10` : 'var(--bg-card)',
                                                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                            }}>
                                            <Icon size={18} style={{ color: v.color, marginBottom: 4 }} />
                                            <div style={{ fontSize: 11, fontWeight: 600, color: logType === v.type ? v.color : 'var(--text-secondary)' }}>{v.label}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <input
                                className="input-field"
                                placeholder={vitalTypes.find(v => v.type === logType)?.placeholder || 'Value'}
                                value={logValue}
                                onChange={e => setLogValue(e.target.value)}
                                style={{ marginBottom: 10, fontSize: 18, fontWeight: 700, textAlign: 'center' }}
                                onKeyDown={e => e.key === 'Enter' && handleLog()}
                                autoFocus
                            />
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                                {logType === 'bp' ? 'Enter as systolic/diastolic (e.g., 120/80)' : `Enter ${vitalTypes.find(v => v.type === logType)?.label} in ${vitalTypes.find(v => v.type === logType)?.unit}`}
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn-primary" onClick={handleLog} disabled={!logValue.trim()} style={{ flex: 1, opacity: !logValue.trim() ? 0.5 : 1 }}>Save</button>
                                <button className="btn-secondary" onClick={() => setShowLog(false)} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
