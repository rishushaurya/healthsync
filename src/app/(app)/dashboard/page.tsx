'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, getJourneys, getVitals, getReports, getAppointments, getUnreadNotificationCount, type UserProfile, type HealthJourney } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';
import { formatNumber } from '@/lib/translations';
import { calculateHealthScore, buildAIContext, formatContextForAI } from '@/lib/ai-context';
import {
    Upload, Stethoscope, Brain, Users, Sun, Sunrise, Moon,
    Heart, Droplets, Thermometer, Bot, RefreshCw,
    Rocket, FileText, Clock, Pill, TrendingUp, Activity,
    Salad, Droplet, CalendarDays, AlertCircle, Bell
} from 'lucide-react';

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return { period: 'morning', greeting: 'Good Morning', Icon: Sunrise };
    if (hour < 17) return { period: 'afternoon', greeting: 'Good Afternoon', Icon: Sun };
    return { period: 'evening', greeting: 'Good Evening', Icon: Moon };
}

interface AIInsight {
    text: string;
    type: 'positive' | 'tip' | 'reminder';
}

export default function DashboardPage() {
    const { t, lang } = useLanguage();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [journeys, setJourneysList] = useState<HealthJourney[]>([]);
    const [healthScore, setHealthScore] = useState(50);
    const [insights, setInsights] = useState<AIInsight[]>([
        { text: 'Log your vitals daily for better health tracking', type: 'tip' },
        { text: 'Upload a medical report for AI analysis', type: 'reminder' },
        { text: 'Your health journey starts with small steps!', type: 'positive' },
    ]);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const timeInfo = getTimeOfDay();

    const fetchInsights = async () => {
        setInsightsLoading(true);
        try {
            const ctx = buildAIContext();
            const contextStr = formatContextForAI(ctx);
            const res = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: 'generate_insights', text: contextStr }),
            });
            const data = await res.json();
            if (data.result) {
                try {
                    const jsonMatch = data.result.match(/\[[\s\S]*\]/);
                    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
                    if (parsed.length > 0) setInsights(parsed.slice(0, 3));
                } catch { /* keep defaults */ }
            }
        } catch { /* keep defaults */ }
        setInsightsLoading(false);
    };

    useEffect(() => {
        setMounted(true);
        const u = getCurrentUser();
        setUser(u);
        setJourneysList(getJourneys());
        setHealthScore(calculateHealthScore(getVitals()));
    }, []);

    if (!mounted) return null;

    const activeJourney = journeys.find(j => j.status === 'active');
    const recentReports = getReports().slice(-2);
    const nextAppointment = getAppointments().find(a => a.status === 'booked');

    const scoreColor = healthScore >= 75 ? '#10B981' : healthScore >= 50 ? '#F59E0B' : '#EF4444';
    const scoreLabels: Record<string, string> = {
        en: healthScore >= 80 ? 'Excellent' : healthScore >= 65 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs Attention',
        hi: healthScore >= 80 ? 'उत्कृष्ट' : healthScore >= 65 ? 'अच्छा' : healthScore >= 50 ? 'ठीक' : 'ध्यान दें',
        ta: healthScore >= 80 ? 'சிறப்பு' : healthScore >= 65 ? 'நல்லது' : healthScore >= 50 ? 'சரி' : 'கவனம் தேவை',
        kn: healthScore >= 80 ? 'ಅತ್ಯುತ್ತಮ' : healthScore >= 65 ? 'ಒಳ್ಳೆಯದು' : healthScore >= 50 ? 'ಸರಿ' : 'ಗಮನ ಬೇಕು',
        bn: healthScore >= 80 ? 'চমৎকার' : healthScore >= 65 ? 'ভালো' : healthScore >= 50 ? 'মোটামুটি' : 'মনোযোগ দিন',
        mr: healthScore >= 80 ? 'उत्कृष्ट' : healthScore >= 65 ? 'चांगले' : healthScore >= 50 ? 'ठीक' : 'लक्ष द्या',
    };
    const scoreLabel = scoreLabels[lang] || scoreLabels['en'];

    const quickActions = [
        { Icon: Upload, label: 'Upload Report', href: '/reports', gradient: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)' },
        { Icon: Stethoscope, label: 'Find Doctor', href: '/doctors', gradient: 'linear-gradient(135deg, #10B981, #0EA5E9)' },
        { Icon: Brain, label: 'Ask AI', href: '/digital-twin', gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
        { Icon: Users, label: 'Family', href: '/family', gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
    ];

    const contextTips = {
        morning: [
            { Icon: Pill, title: 'Morning Meds', desc: activeJourney?.medications?.length ? `${activeJourney.medications.length} medications to take` : 'No meds scheduled', link: '/recovery' },
            { Icon: Activity, title: 'Morning Vitals', desc: 'Log your BP & blood sugar', link: '/vitals' },
            { Icon: TrendingUp, title: 'Health Tip', desc: 'Start with warm water & stretching', link: '/digital-twin' },
        ],
        afternoon: [
            { Icon: Droplet, title: 'Stay Hydrated', desc: 'Aim for 8 glasses of water', link: '/vitals' },
            { Icon: TrendingUp, title: 'Progress', desc: activeJourney ? `${activeJourney.progress}% complete` : 'Start a recovery plan', link: '/recovery' },
            { Icon: Salad, title: 'Nutrition Tip', desc: 'Light walking after meals', link: '/digital-twin' },
        ],
        evening: [
            { Icon: Heart, title: 'Evening Check', desc: 'Log how you feel tonight', link: '/vitals' },
            { Icon: Pill, title: 'Night Meds', desc: activeJourney?.medications?.length ? 'Check evening medicines' : 'No evening meds', link: '/recovery' },
            { Icon: CalendarDays, title: 'Tomorrow', desc: nextAppointment ? `Dr. ${nextAppointment.doctorName}` : 'No upcoming appointments', link: '/doctors' },
        ],
    }[timeInfo.period] || [];

    const allVitals = getVitals();
    const vitalDefs = [
        { type: 'bp', label: 'Blood Pressure', Icon: Heart, color: '#EF4444', unit: 'mmHg' },
        { type: 'sugar', label: 'Blood Sugar', Icon: Droplets, color: '#0EA5E9', unit: 'mg/dL' },
        { type: 'temperature', label: 'Temperature', Icon: Thermometer, color: '#F59E0B', unit: '°F' },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Greeting */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <timeInfo.Icon size={18} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{timeInfo.greeting}</span>
                        </div>
                        <h1 style={{ fontSize: 30, fontWeight: 800 }}>
                            {user?.name || 'Welcome'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4 }}>
                            {activeJourney ? `Recovery: ${activeJourney.progress}% complete` : 'Your health dashboard is ready'}
                        </p>
                    </div>
                    <Link href="/notifications" style={{
                        position: 'relative', width: 48, height: 48, borderRadius: 14,
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', textDecoration: 'none', color: 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                    }}>
                        <Bell size={20} />
                        {getUnreadNotificationCount() > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20,
                                borderRadius: '50%', background: '#EF4444', color: 'white',
                                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', padding: '0 4px',
                            }}>{getUnreadNotificationCount() > 9 ? '9+' : getUnreadNotificationCount()}</span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Top Row: Score + Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, marginBottom: 24 }}>
                {/* Health Score */}
                <div className="glass-card-static" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: 120, height: 120, borderRadius: '50%',
                        border: `6px solid ${scoreColor}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: `${scoreColor}10`,
                    }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: scoreColor }}>{formatNumber(healthScore, lang)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{scoreLabel}</span>
                    </div>
                    <Link href="/vitals" style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none', marginTop: 10 }}>
                        Log vitals to improve →
                    </Link>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {quickActions.map((action, i) => (
                        <Link key={i} href={action.href} style={{ textDecoration: 'none' }}>
                            <div className="glass-card" style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12, background: action.gradient,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                                }}>
                                    <action.Icon size={22} style={{ color: 'white' }} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{action.label}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Context Cards */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <timeInfo.Icon size={18} style={{ color: 'var(--color-primary)' }} />
                    {timeInfo.period.charAt(0).toUpperCase() + timeInfo.period.slice(1)} Focus
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {contextTips.map((card, i) => (
                        <Link key={i} href={card.link} style={{ textDecoration: 'none' }}>
                            <div className="glass-card" style={{ padding: 18, cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: 'rgba(14, 165, 233, 0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <card.Icon size={20} style={{ color: 'var(--color-primary)' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{card.title}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{card.desc}</div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Active Journey */}
            {activeJourney && (
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Active Recovery
                    </h2>
                    <Link href="/recovery" style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{ padding: 22, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontSize: 17, fontWeight: 700 }}>{activeJourney.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Started {new Date(activeJourney.startDate).toLocaleDateString()}</div>
                                </div>
                                <span style={{
                                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    background: activeJourney.verified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: activeJourney.verified ? '#10B981' : '#F59E0B',
                                }}>
                                    {activeJourney.verified ? 'Verified' : 'Pending'}
                                </span>
                            </div>
                            <div className="progress-bar" style={{ marginBottom: 8 }}>
                                <div className="progress-fill" style={{ width: `${activeJourney.progress}%` }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                                <span>{activeJourney.progress}% Complete</span>
                                <span>View Details →</span>
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* CTA if no journey */}
            {journeys.length === 0 && (
                <div className="glass-card-static" style={{
                    padding: 36, textAlign: 'center', marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(139,92,246,0.05))',
                }}>
                    <Rocket size={44} style={{ color: 'var(--color-primary)', marginBottom: 12, opacity: 0.7 }} />
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Start Your Health Journey</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 18, maxWidth: 380, margin: '0 auto 18px' }}>
                        Upload a medical report or talk to AI to begin your personalized recovery.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <Link href="/reports"><button className="btn-primary"><Upload size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Upload Report</button></Link>
                        <Link href="/digital-twin"><button className="btn-secondary"><Brain size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Talk to AI</button></Link>
                    </div>
                </div>
            )}

            {/* Bottom: Vitals + AI Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Vitals */}
                <div className="glass-card-static" style={{ padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={16} style={{ color: 'var(--color-primary)' }} /> {t('dash.recentVitals')}
                        </h3>
                        <Link href="/vitals" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}>View All</Link>
                    </div>
                    {vitalDefs.map((vd, i) => {
                        const latest = allVitals.filter(v => v.type === vd.type).pop();
                        const VIcon = vd.Icon;
                        return (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 0',
                                borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <VIcon size={16} style={{ color: vd.color }} />
                                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{vd.label}</span>
                                </div>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: 15 }}>{latest?.value || '--'}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{vd.unit}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* AI Insights */}
                <div className="glass-card-static" style={{ padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bot size={16} style={{ color: 'var(--color-primary)' }} /> AI Insights
                        </h3>
                        <button onClick={fetchInsights} disabled={insightsLoading} style={{
                            background: 'none', border: '1px solid var(--border-color)', borderRadius: 8,
                            padding: '4px 12px', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer',
                            opacity: insightsLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <RefreshCw size={12} /> {insightsLoading ? '...' : 'Refresh'}
                        </button>
                    </div>
                    {insights.map((insight, i) => (
                        <div key={i} style={{
                            padding: '10px 14px', borderRadius: 10, marginBottom: i < insights.length - 1 ? 8 : 0,
                            background: insight.type === 'positive' ? 'rgba(16,185,129,0.06)' : insight.type === 'tip' ? 'rgba(14,165,233,0.06)' : 'rgba(245,158,11,0.06)',
                            border: `1px solid ${insight.type === 'positive' ? 'rgba(16,185,129,0.12)' : insight.type === 'tip' ? 'rgba(14,165,233,0.12)' : 'rgba(245,158,11,0.12)'}`,
                            fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)',
                        }}>
                            {insight.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Reports */}
            {recentReports.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Recent Reports
                        </h2>
                        <Link href="/reports" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}>View All</Link>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {recentReports.map((report, i) => (
                            <Link key={i} href="/reports" style={{ textDecoration: 'none' }}>
                                <div className="glass-card" style={{ padding: 16, cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <FileText size={22} style={{ color: 'var(--color-primary)' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{report.fileName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(report.uploadDate).toLocaleDateString()}</div>
                                        </div>
                                        {report.urgencyLevel && (
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                                background: report.urgencyLevel === 'red' ? 'rgba(239,68,68,0.1)' : report.urgencyLevel === 'amber' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: report.urgencyLevel === 'red' ? '#EF4444' : report.urgencyLevel === 'amber' ? '#F59E0B' : '#10B981',
                                            }}>
                                                {report.urgencyLevel.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
