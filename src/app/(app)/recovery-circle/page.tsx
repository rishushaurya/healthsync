'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Heart, Trophy, TrendingUp, MessageCircle, ThumbsUp, Sparkles, Activity, ClipboardList, Award, CheckCircle, Rocket, Target, Star, Zap, ChartLine } from 'lucide-react';
import { getJourneys, getCurrentUser, getVitals, type HealthJourney } from '@/lib/store';
import { calculateHealthScore } from '@/lib/ai-context';
import Link from 'next/link';

export default function RecoveryCirclePage() {
    const [journeys, setJourneysList] = useState<HealthJourney[]>([]);
    const [healthScore, setHealthScore] = useState(50);
    const [userName, setUserName] = useState('You');

    useEffect(() => {
        const user = getCurrentUser();
        if (user) setUserName(user.name || 'You');
        setJourneysList(getJourneys());
        setHealthScore(calculateHealthScore(getVitals()));
    }, []);

    const activeJourney = journeys.find(j => j.status === 'active');
    const completedJourneys = journeys.filter(j => j.status === 'completed');

    // Generate activity feed from real data
    const activities = [];
    if (activeJourney) {
        const completedSteps = activeJourney.timeline?.filter(t => t.status === 'completed') || [];
        completedSteps.slice(-3).forEach(step => {
            activities.push({ user: userName, action: `completed "${step.title}"`, time: 'Recently', icon: CheckCircle });
        });
        if (activeJourney.medications?.length) {
            activities.push({ user: userName, action: `has ${activeJourney.medications.length} active medications`, time: 'Ongoing', icon: Activity });
        }
    }
    const vitals = getVitals();
    if (vitals.length > 0) {
        const last = vitals[vitals.length - 1];
        activities.push({ user: userName, action: `logged ${last.type}: ${last.value} ${last.unit}`, time: last.date || 'Recently', icon: TrendingUp });
    }
    if (activities.length === 0) {
        activities.push({ user: userName, action: 'joined HealthSync', time: 'Today', icon: Sparkles });
        activities.push({ user: userName, action: 'exploring health features', time: 'Now', icon: Heart });
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>Recovery Circle</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Your health community and progress overview</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                    { icon: TrendingUp, label: 'Health Score', value: `${healthScore}/100`, color: healthScore >= 70 ? '#10B981' : '#F59E0B' },
                    { icon: Trophy, label: 'Journeys Completed', value: `${completedJourneys.length}`, color: '#8B5CF6' },
                    { icon: Activity, label: 'Active Progress', value: activeJourney ? `${activeJourney.progress}%` : 'None', color: '#0EA5E9' },
                    { icon: Heart, label: 'Vitals Logged', value: `${vitals.length}`, color: '#EF4444' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-card-static"
                            style={{ padding: 20, textAlign: 'center' }}
                        >
                            <Icon size={24} style={{ color: stat.color, marginBottom: 8 }} />
                            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stat.label}</div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Active Journey Card */}
            {activeJourney && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card-static"
                    style={{ padding: 22, marginBottom: 24 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={18} style={{ color: 'var(--color-primary)' }} /> {activeJourney.title}</h3>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Started {new Date(activeJourney.startDate).toLocaleDateString()}
                            </span>
                        </div>
                        <Link href="/recovery" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}>
                            View Plan →
                        </Link>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: 8 }}>
                        <div className="progress-fill" style={{ width: `${activeJourney.progress}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                        <span>{activeJourney.progress}% complete</span>
                        <span>{activeJourney.timeline?.filter(t => t.status === 'completed').length || 0}/{activeJourney.timeline?.length || 0} steps done</span>
                    </div>
                </motion.div>
            )}

            {/* Activity Feed */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card-static"
                style={{ padding: 22, marginBottom: 24 }}
            >
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={16} style={{ color: 'var(--color-primary)' }} /> Activity Feed</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {activities.map((activity, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < activities.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                            <span>{(() => { const IcoComp = activity.icon; return <IcoComp size={18} style={{ color: 'var(--color-primary)' }} />; })()}</span>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activity.user}</span>{' '}
                                <span style={{ color: 'var(--text-secondary)' }}>{activity.action}</span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activity.time}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Milestones */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card-static"
                style={{ padding: 22 }}
            >
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Award size={16} style={{ color: 'var(--color-primary)' }} /> Milestones</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {[
                        { label: 'First Journey', unlocked: journeys.length > 0, Icon: Rocket },
                        { label: 'First Vital Logged', unlocked: vitals.length > 0, Icon: TrendingUp },
                        { label: '10 Vitals Tracked', unlocked: vitals.length >= 10, Icon: ChartLine },
                        { label: 'Journey Completed', unlocked: completedJourneys.length > 0, Icon: Target },
                        { label: 'Health Score 80+', unlocked: healthScore >= 80, Icon: Zap },
                        { label: 'Consistent Tracker', unlocked: vitals.length >= 30, Icon: Star },
                    ].map((milestone, i) => (
                        <div key={i} style={{
                            padding: 16, borderRadius: 12, textAlign: 'center',
                            background: milestone.unlocked ? 'rgba(16, 185, 129, 0.06)' : 'rgba(128,128,128,0.04)',
                            border: `1px solid ${milestone.unlocked ? 'rgba(16, 185, 129, 0.15)' : 'var(--border-color)'}`,
                            opacity: milestone.unlocked ? 1 : 0.5,
                        }}>
                            <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><milestone.Icon size={24} style={{ color: milestone.unlocked ? 'var(--color-primary)' : 'var(--text-muted)' }} /></div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: milestone.unlocked ? '#10B981' : 'var(--text-muted)' }}>
                                {milestone.label}
                            </div>
                            {milestone.unlocked && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Unlocked</div>}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
