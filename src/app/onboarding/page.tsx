'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Brain, ArrowRight, Heart,
    Stethoscope, Sparkles, Activity, Sun, Moon, Droplets, Palette,
    Hospital, Search, Dumbbell, ChartLine, Pill, Monitor, Salad
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, type UserProfile } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';
import { LangCode } from '@/lib/translations';

const ONBOARDING_STEPS = [
    {
        id: 'language',
        tKey: 'ob.langQ',
        options: [
            { value: 'en', label: 'English', desc: 'EN' },
            { value: 'hi', label: 'हिंदी (Hindi)', desc: 'HI' },
            { value: 'ta', label: 'தமிழ் (Tamil)', desc: 'TA' },
            { value: 'te', label: 'తెలుగు (Telugu)', desc: 'TE' },
        ],
    },
    {
        id: 'intent',
        tKey: 'ob.intentQ',
        options: [
            { value: 'diagnosed', tKey: 'ob.opt.diagnosed', Icon: Hospital },
            { value: 'undiagnosed', tKey: 'ob.opt.undiagnosed', Icon: Search },
            { value: 'wellness', tKey: 'ob.opt.wellness', Icon: Dumbbell },
        ],
    },
    {
        id: 'conditions',
        tKey: 'ob.condQ',
        textInput: true,
        placeholder: 'e.g., Diabetes, Kidney Stones, Back Pain, or describe your symptoms...',
    },
    {
        id: 'profile',
        tKey: 'ob.profQ',
        fields: [
            { key: 'age', label: 'Age Range', options: ['18-25', '26-35', '36-45', '46-55', '55+'] },
            { key: 'gender', label: 'Gender (Optional)', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
            { key: 'activityLevel', label: 'Activity Level', options: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'] },
        ],
    },
    {
        id: 'goals',
        tKey: 'ob.goalsQ',
        multiSelect: true,
        options: [
            { value: 'recovery', tKey: 'ob.opt.recovery', Icon: ChartLine },
            { value: 'medication', tKey: 'ob.opt.medication', Icon: Pill },
            { value: 'lifestyle', tKey: 'ob.opt.lifestyle', Icon: Dumbbell },
            { value: 'doctor', tKey: 'ob.opt.doctor', Icon: Stethoscope },
            { value: 'nutrition', tKey: 'ob.opt.nutrition', Icon: Salad },
            { value: 'mental', tKey: 'ob.opt.mental', Icon: Brain },
        ],
    },
    {
        id: 'theme',
        tKey: 'ob.themeQ',
        options: [
            { value: 'light', label: 'Light Mode', Icon: Sun, desc: 'Clean & bright' },
            { value: 'dark', label: 'Dark Mode', Icon: Moon, desc: 'Easy on the eyes' },
            { value: 'nature', label: 'Nature Green', Icon: Activity, desc: 'Fresh & calming' },
            { value: 'calm-blue', label: 'Calm Blue', Icon: Droplets, desc: 'Soothing & relaxing' },
            { value: 'warm', label: 'Warm Wellness', Icon: Heart, desc: 'Cozy & comforting' },
            { value: 'gradient', label: 'High Contrast', Icon: Palette, desc: 'Maximum readability' },
        ],
    },
];

interface OnboardingStep {
    id: string;
    tKey: string;
    options?: Array<{ value: string; label?: string; tKey?: string; Icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; desc?: string }>;
    fields?: Array<{ key: string; label: string; options: string[] }>;
    multiSelect?: boolean;
    textInput?: boolean;
    placeholder?: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [userData, setUserData] = useState<Partial<UserProfile>>({});
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [profileFields, setProfileFields] = useState<Record<string, string>>({});
    const [isTyping, setIsTyping] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [conditionText, setConditionText] = useState('');
    const [onboardingDone, setOnboardingDone] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);

    const initializedRef = useRef(false);
    const { t, setLang } = useLanguage();

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        setTimeout(() => {
            addAIMessage(t(ONBOARDING_STEPS[0].tKey));
        }, 400);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showOptions]);

    useEffect(() => {
        setProgress(((step) / ONBOARDING_STEPS.length) * 100);
    }, [step]);

    const addAIMessage = (content: string, isFinal = false) => {
        setIsTyping(true);
        setShowOptions(false);
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', content }]);
            setIsTyping(false);
            if (!isFinal) {
                setTimeout(() => setShowOptions(true), 80);
            }
        }, 300);
    };

    const handleOptionSelect = (value: string, label: string) => {
        const currentStep = ONBOARDING_STEPS[step] as OnboardingStep;
        setShowOptions(false);
        setMessages(prev => [...prev, { role: 'user', content: label }]);

        const newData = { ...userData };

        switch (currentStep.id) {
            case 'intent':
                newData.intent = value as UserProfile['intent'];
                break;
            case 'language':
                newData.language = value;
                setLang(value as LangCode);
                break;
            case 'theme':
                newData.theme = value;
                document.documentElement.setAttribute('data-theme', value);
                break;
        }

        setUserData(newData);

        if (step < ONBOARDING_STEPS.length - 1) {
            const nextStep = step + 1;
            setStep(nextStep);
            
            // Re-fetch translation manually from translation dictionary for the next step 
            // because `t` inside this callback might be stale or take a render to update
            import('@/lib/translations').then(({ t: manualT }) => {
                setTimeout(() => addAIMessage(manualT(ONBOARDING_STEPS[nextStep].tKey, newData.language as LangCode || 'en')), 200);
            });
        } else {
            setOnboardingDone(true);
            setStep(ONBOARDING_STEPS.length);
            completeOnboarding(newData);
        }
    };

    const handleConditionSubmit = () => {
        setShowOptions(false);
        const text = conditionText.trim() || 'No specific conditions mentioned';
        setMessages(prev => [...prev, { role: 'user', content: text }]);

        const conditions = conditionText.trim()
            ? conditionText.split(',').map(c => c.trim()).filter(Boolean)
            : [];
        setUserData(prev => ({ ...prev, existingConditions: conditions }));

        const nextStep = step + 1;
        setStep(nextStep);
        setTimeout(() => addAIMessage(t(ONBOARDING_STEPS[nextStep].tKey)), 200);
    };

    const handleProfileSubmit = () => {
        setShowOptions(false);
        setMessages(prev => [...prev, {
            role: 'user',
            content: `Age: ${profileFields.age || 'Not specified'}, Gender: ${profileFields.gender || 'Not specified'}, Activity: ${profileFields.activityLevel || 'Not specified'}`
        }]);

        setUserData(prev => ({ ...prev, ...profileFields }));

        const nextStep = step + 1;
        setStep(nextStep);
        setTimeout(() => addAIMessage(t(ONBOARDING_STEPS[nextStep].tKey)), 200);
    };

    const handleGoalsSubmit = () => {
        setShowOptions(false);
        const labels = selectedGoals.map(g => {
            const opt = (ONBOARDING_STEPS[3] as OnboardingStep).options?.find(o => o.value === g);
            return opt?.label || g;
        });

        setMessages(prev => [...prev, { role: 'user', content: labels.join(', ') }]);
        setUserData(prev => ({ ...prev, healthGoals: selectedGoals }));

        const nextStep = step + 1;
        setStep(nextStep);
        setTimeout(() => addAIMessage(t(ONBOARDING_STEPS[nextStep].tKey)), 200);
    };

    const completeOnboarding = (data: Partial<UserProfile>) => {
        const user = getCurrentUser();
        if (user) {
            const updated = { ...user, ...data, onboardingComplete: true };
            setCurrentUser(updated);
        }

        setTimeout(() => {
            addAIMessage("✨ Your HealthSync profile is ready! Redirecting to dashboard...", true);
            setTimeout(() => router.push('/journey/patient-portal'), 800);
        }, 200);
    };

    const currentStep = ONBOARDING_STEPS[step] as OnboardingStep;

    return (
        <div className="page-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={22} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>HealthSync AI</div>
                    <div style={{ fontSize: 12, color: 'var(--color-primary)' }}>
                        {isTyping ? 'Typing...' : 'Online'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Step {step + 1}/{ONBOARDING_STEPS.length}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: 3, background: 'var(--bg-card)' }}>
                <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'var(--gradient-primary)', borderRadius: 4 }}
                />
            </div>

            {/* Chat Area */}
            <div style={{
                flex: 1, padding: '24px', maxWidth: 700, margin: '0 auto', width: '100%',
                display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto',
            }}>
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}
                        >
                            {msg.role === 'ai' && (
                                <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Brain size={16} color="white" />
                                </div>
                            )}
                            <div className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}>
                                <p style={{ lineHeight: 1.6, fontSize: 15 }}>{msg.content}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Brain size={16} color="white" />
                        </div>
                        <div className="chat-bubble-ai" style={{ padding: '14px 22px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[0, 1, 2].map(i => (
                                    <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)' }} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Current Step Options — only show AFTER AI responds */}
                {showOptions && !isTyping && !onboardingDone && messages.length > 0 && step < ONBOARDING_STEPS.length && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ marginTop: 8 }}
                    >
                        {/* Text Input for conditions */}
                        {currentStep.textInput && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <textarea
                                    className="input-field"
                                    placeholder={currentStep.placeholder}
                                    value={conditionText}
                                    onChange={e => setConditionText(e.target.value)}
                                    rows={3}
                                    style={{ resize: 'vertical', minHeight: 80 }}
                                />
                                <button className="btn-primary" onClick={handleConditionSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    Continue <ArrowRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* Regular Options */}
                        {currentStep.options && !currentStep.multiSelect && !currentStep.fields && !currentStep.textInput && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {currentStep.options.map((opt) => (
                                    <motion.button
                                        key={opt.value}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleOptionSelect(opt.value, opt.label || t(opt.tKey!))}
                                        className="glass-card"
                                        style={{
                                            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                                            border: '1px solid var(--glass-border)', cursor: 'pointer', textAlign: 'left',
                                            color: 'var(--text-primary)', background: 'var(--glass-bg)',
                                        }}
                                    >
                                        {opt.Icon ? <opt.Icon size={22} style={{ color: 'var(--color-primary)' }} /> : <ArrowRight size={22} style={{ color: 'var(--text-muted)' }} />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{opt.label || t(opt.tKey!)}</div>
                                            {opt.desc && (
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                                            )}
                                        </div>
                                        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                                    </motion.button>
                                ))}
                            </div>
                        )}

                        {/* Profile Fields */}
                        {currentStep.fields && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {currentStep.fields.map((field) => (
                                    <div key={field.key}>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                            {field.label}
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {field.options.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setProfileFields(prev => ({ ...prev, [field.key]: opt }))}
                                                    style={{
                                                        padding: '8px 16px', borderRadius: 10,
                                                        border: `1px solid ${profileFields[field.key] === opt ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                        background: profileFields[field.key] === opt ? 'rgba(14, 116, 144, 0.12)' : 'var(--bg-card)',
                                                        color: profileFields[field.key] === opt ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                        cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button className="btn-primary" onClick={handleProfileSubmit} style={{ marginTop: 8 }}>
                                    Continue <ArrowRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* Multi-select Goals */}
                        {currentStep.multiSelect && currentStep.options && (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                                    {currentStep.options.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setSelectedGoals(prev =>
                                                    prev.includes(opt.value) ? prev.filter(g => g !== opt.value) : [...prev, opt.value]
                                                );
                                            }}
                                            style={{
                                                padding: '14px 16px', borderRadius: 14,
                                                border: `1px solid ${selectedGoals.includes(opt.value) ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                background: selectedGoals.includes(opt.value) ? 'rgba(14, 116, 144, 0.12)' : 'var(--bg-card)',
                                                color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <span style={{ display: 'block', marginBottom: 6 }}>{opt.Icon ? <opt.Icon size={22} style={{ color: 'var(--color-primary)' }} /> : null}</span>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label || t(opt.tKey!)}</span>
                                        </button>
                                    ))}
                                </div>
                                {selectedGoals.length > 0 && (
                                    <button className="btn-primary" onClick={handleGoalsSubmit} style={{ marginTop: 16, width: '100%' }}>
                                        Continue with {selectedGoals.length} goal{selectedGoals.length > 1 ? 's' : ''} <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                <div ref={chatEndRef} />
            </div>
        </div>
    );
}
