'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Brain, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Stethoscope } from 'lucide-react';
import { setCurrentUser, generateId, simpleHash, loginDoctor, setCurrentDoctor, registerUser, loginUser, type UserProfile } from '@/lib/store';
import { cloudRegisterUser, cloudLoginUser, cloudUpdateUser } from '@/lib/shared-store';

export default function AuthPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(true);
    const [isDoctor, setIsDoctor] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Doctor login
        if (isDoctor) {
            if (!form.email || !form.password) {
                setError('Please enter email and password');
                setLoading(false);
                return;
            }
            const result = loginDoctor(form.email.trim(), form.password.trim());
            if (!result.success) {
                setError(result.error || 'Login failed');
                setLoading(false);
                return;
            }
            setCurrentDoctor(result.doctor!);
            router.push('/doctor-dashboard');
            return;
        }

        // Patient Sign Up
        if (isSignUp) {
            if (!form.name.trim()) { setError('Please enter your name'); setLoading(false); return; }
            if (!form.email.trim()) { setError('Please enter your email'); setLoading(false); return; }
            if (!form.password || form.password.length < 4) { setError('Password must be at least 4 characters'); setLoading(false); return; }

            const user: UserProfile = {
                id: generateId(),
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone,
                password: simpleHash(form.password),
                age: '',
                gender: '',
                activityLevel: '',
                existingConditions: [],
                healthGoals: [],
                language: 'en',
                theme: 'light',
                intent: '',
                onboardingComplete: false,
                createdAt: new Date().toISOString(),
            };

            // Register in both cloud (Redis) and local (localStorage)
            const cloudResult = await cloudRegisterUser(user);
            if (!cloudResult.success) {
                setError(cloudResult.error || 'Registration failed');
                setLoading(false);
                return;
            }
            registerUser(user); // Also save locally
            setCurrentUser(user);
            router.push('/onboarding');
            return;
        }

        // Patient Sign In — try cloud first, then fall back to local
        if (!form.email.trim()) { setError('Please enter your email'); setLoading(false); return; }
        if (!form.password) { setError('Please enter your password'); setLoading(false); return; }

        const cloudResult = await cloudLoginUser(form.email.trim(), form.password);
        if (cloudResult.success && cloudResult.user) {
            // Also save locally so local pages work instantly
            registerUser(cloudResult.user);
            setCurrentUser(cloudResult.user);
            router.push(cloudResult.user.onboardingComplete ? '/dashboard' : '/onboarding');
            return;
        }

        // Fallback to local store
        const localResult = loginUser(form.email.trim(), form.password);
        if (!localResult.success) {
            setError(cloudResult.error || localResult.error || 'Login failed');
            setLoading(false);
            return;
        }
        setCurrentUser(localResult.user!);
        // Also sync to cloud
        cloudUpdateUser(localResult.user!);
        router.push(localResult.user!.onboardingComplete ? '/dashboard' : '/onboarding');
    };

    return (
        <div className="page-content" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'fixed', width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)',
                top: '10%', right: '-10%', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'fixed', width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
                bottom: '10%', left: '-5%', pointerEvents: 'none',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="glass-card-static"
                style={{ width: '100%', maxWidth: 440, padding: 40, position: 'relative', zIndex: 1 }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'var(--gradient-primary)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16,
                        boxShadow: '0 8px 30px rgba(14, 165, 233, 0.3)',
                    }}>
                        <Brain size={28} color="white" />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>HealthSync</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 15 }}>
                        {isDoctor ? 'Doctor Portal' : isSignUp ? 'Create your health profile' : 'Welcome back'}
                    </p>
                </div>

                {/* Mode Toggle */}
                <div style={{
                    display: 'flex', background: 'var(--bg-card)', borderRadius: 12, padding: 4, marginBottom: 28,
                }}>
                    {['Sign Up', 'Sign In', 'Doctor'].map((label, i) => {
                        const active = (i === 0 && isSignUp && !isDoctor) || (i === 1 && !isSignUp && !isDoctor) || (i === 2 && isDoctor);
                        return (
                            <button
                                key={label}
                                onClick={() => { setError(''); if (i === 0) { setIsSignUp(true); setIsDoctor(false); } else if (i === 1) { setIsSignUp(false); setIsDoctor(false); } else { setIsDoctor(true); setIsSignUp(false); } }}
                                style={{
                                    flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none',
                                    background: active ? 'var(--gradient-primary)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-secondary)',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease',
                                }}
                            >
                                {i === 2 && <Stethoscope size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#EF4444', fontSize: 13, fontWeight: 500,
                            }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <AnimatePresence mode="wait">
                        {isSignUp && !isDoctor && (
                            <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                                <input className="input-field" style={{ paddingLeft: 42 }} placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                        <input className="input-field" style={{ paddingLeft: 42 }} type="email" placeholder={isDoctor ? 'Doctor Email' : 'Email Address'} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>

                    <AnimatePresence mode="wait">
                        {isSignUp && !isDoctor && (
                            <motion.div key="phone" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                                <input className="input-field" style={{ paddingLeft: 42 }} type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                        <input className="input-field" style={{ paddingLeft: 42, paddingRight: 44 }} type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                        {loading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                        ) : (
                            <>
                                {isDoctor ? 'Access Portal' : isSignUp ? 'Start Your Journey' : 'Continue'} <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Doctor hint */}
                {isDoctor && (
                    <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.12)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        Demo: priya@healthsync.com / doctor123
                    </div>
                )}

                {/* ABHA badge */}
                <div style={{
                    marginTop: 24, padding: '10px 16px', borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)',
                    textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
                }}>
                    ABHA Compatible • DPDP Act 2023 Compliant
                </div>
            </motion.div>
        </div>
    );
}
