'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, ArrowRight, ArrowLeft, ShieldCheck, BadgeCheck, Languages, Stethoscope, UserRound } from 'lucide-react';
import {
    setCurrentUser, generateId, registerUser, loginUser, simpleHash, loginDoctor,
    setCurrentDoctor, startJourney, type UserProfile
} from '@/lib/store';

const REASONS = [
    'New symptom',
    'Existing condition',
    'Follow-up',
    'Medication-related concern',
    'Report review',
    'General consultation',
    'Other'
];

// Gender drives the 3D body model and sex-specific intake questions
const GENDERS = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'other', label: 'Other' },
    { value: 'unspecified', label: 'Prefer not to say' },
];

const STEP_TITLES = {
    phone: ['Sign in or create an account', 'We’ll send a one-time code to your mobile number.'],
    otp: ['Enter the code', ''],
    profile: ['Tell us about you', 'This helps your doctor and tailors your check-in questions.'],
    reason: ['What brings you in today?', 'Pick the closest match. You can describe it in detail next.'],
} as const;

export default function AuthPage() {
    const router = useRouter();
    const [portalRole, setPortalRole] = useState<'patient' | 'doctor'>('patient');

    // Patient State
    const [patientStep, setPatientStep] = useState<'phone' | 'otp' | 'profile' | 'reason'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [profile, setProfile] = useState({ name: '', age: '', gender: '', email: '', location: '' });
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    // Doctor State
    const [docEmail, setDocEmail] = useState('');
    const [docPassword, setDocPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Landing page links here with ?role=doctor
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('role') === 'doctor') setPortalRole('doctor');
    }, []);

    const switchRole = (role: 'patient' | 'doctor') => { setPortalRole(role); setError(''); };

    const handleSendOTP = (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError('Enter a valid 10-digit Indian mobile number');
            return;
        }
        setError('');
        setLoading(true);
        // Simulate sending OTP
        setTimeout(() => {
            setLoading(false);
            setPatientStep('otp');
        }, 800);
    };

    const handleVerifyOTP = (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\d{4}$/.test(otp)) {
            setError('Enter the 4-digit code');
            return;
        }
        setError('');
        setLoading(true);
        // Simulate verification
        setTimeout(() => {
            setLoading(false);
            // Check if user exists (mocked using phone as unique identifier for this demo)
            const result = loginUser(`${phone}@healthsync.com`, 'otp-login');
            if (result.success) {
                setCurrentUser(result.user!);
                setPatientStep('reason');
            } else {
                setPatientStep('profile');
            }
        }, 800);
    };

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        const age = Number(profile.age);
        if (!profile.name.trim() || !profile.gender || !age) {
            setError('Please fill in your name, age and gender');
            return;
        }
        if (age < 1 || age > 120) {
            setError('Please enter an age between 1 and 120');
            return;
        }
        setError('');
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
            const user: UserProfile = {
                id: generateId(),
                name: profile.name.trim(),
                email: profile.email.trim() || `${phone}@healthsync.com`,
                phone: phone,
                password: simpleHash('otp-login'), // mock password for OTP users
                location: profile.location.trim(),
                age: String(age),
                gender: profile.gender,
                activityLevel: '',
                existingConditions: [],
                healthGoals: [],
                language: 'en',
                theme: 'light',
                intent: '',
                onboardingComplete: true,
                createdAt: new Date().toISOString(),
            };
            registerUser(user);
            setCurrentUser(user);
            setPatientStep('reason');
        }, 600);
    };

    const handleStartJourney = (e: React.FormEvent) => {
        e.preventDefault();
        const finalReason = reason === 'Other' ? customReason.trim() : reason;
        if (!finalReason) {
            setError('Please tell us the reason for your visit');
            return;
        }

        setLoading(true);
        const currentUser = JSON.parse(localStorage.getItem('healthsync_current_user') || '{}');
        startJourney(currentUser.id, finalReason);
        router.push('/journey/intake');
    };

    const handleDoctorLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!docEmail || !docPassword) {
            setError('Please enter email and password');
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            const result = loginDoctor(docEmail, docPassword);
            if (!result.success) {
                setError(result.error || 'Login failed');
                return;
            }
            setCurrentDoctor(result.doctor!);
            router.push('/doctor-dashboard');
        }, 600);
    };

    const [title, subtitle] = portalRole === 'doctor'
        ? ['Doctor sign in', 'Access your patients, consultations and case reviews.']
        : STEP_TITLES[patientStep];

    return (
        <div className="auth-shell">
            <style>{`
                .auth-shell { min-height: 100vh; display: grid; grid-template-columns: minmax(360px, 0.9fr) 1.1fr; }
                .auth-aside { background: var(--color-primary-dark); color: #fff; padding: 48px; display: flex; flex-direction: column; justify-content: space-between; }
                .auth-aside li { display: flex; gap: 12px; align-items: flex-start; font-size: 16px; line-height: 1.5; }
                .auth-main { display: grid; place-items: center; padding: 40px 20px; }
                .seg { display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--border-color); }
                .seg button { min-height: 40px; border: 0; border-radius: 7px; font: inherit; font-size: 14px; font-weight: 600; background: transparent; color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
                .seg button[aria-pressed="true"] { background: var(--bg-card); color: var(--color-primary); box-shadow: var(--shadow-sm); }
                .choice { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-card); font-weight: 500; }
                .choice:has(input:checked) { border-color: var(--color-primary); background: var(--primary-soft); }
                .choice input { accent-color: var(--color-primary); width: 18px; height: 18px; }
                @media (max-width: 860px) { .auth-shell { grid-template-columns: 1fr; } .auth-aside { display: none; } }
            `}</style>

            <aside className="auth-aside">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none' }}>
                    <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center' }}>
                        <HeartPulse size={21} />
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>HealthSync</span>
                </Link>
                <div>
                    <h2 style={{ color: '#fff', fontSize: 32, fontWeight: 800, lineHeight: 1.15, maxWidth: 420 }}>One record for every step of your care.</h2>
                    <ul style={{ listStyle: 'none', display: 'grid', gap: 18, marginTop: 32, maxWidth: 420 }}>
                        <li><ShieldCheck size={22} style={{ flexShrink: 0 }} /> Your data is shared with a doctor only after you consent.</li>
                        <li><BadgeCheck size={22} style={{ flexShrink: 0 }} /> Every prescription and care plan is signed by a registered doctor.</li>
                        <li><Languages size={22} style={{ flexShrink: 0 }} /> Use HealthSync in English, Hindi, Tamil, Telugu, Bengali or Marathi.</li>
                    </ul>
                </div>
                <p style={{ fontSize: 14, opacity: 0.8 }}>In an emergency, call <a href="tel:108" style={{ color: '#fff', fontWeight: 700 }}>108</a>.</p>
            </aside>

            <main className="auth-main">
                <div style={{ width: '100%', maxWidth: 420 }}>
                    {patientStep === 'phone' && (
                        <div className="seg" role="group" aria-label="Account type" style={{ marginBottom: 28 }}>
                            <button type="button" aria-pressed={portalRole === 'patient'} onClick={() => switchRole('patient')}><UserRound size={16} /> Patient</button>
                            <button type="button" aria-pressed={portalRole === 'doctor'} onClick={() => switchRole('doctor')}><Stethoscope size={16} /> Doctor</button>
                        </div>
                    )}

                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>{title}</h1>
                    {subtitle && <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{subtitle}</p>}
                    {portalRole === 'patient' && patientStep === 'otp' && (
                        <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Sent to +91 {phone}. For this demo, any 4 digits work.</p>
                    )}

                    {error && (
                        <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, marginTop: 20, background: 'var(--danger-soft)', color: 'var(--color-danger)', fontSize: 14, fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginTop: 24 }}>
                        {portalRole === 'doctor' ? (
                            <form onSubmit={handleDoctorLogin} style={{ display: 'grid', gap: 18 }} noValidate>
                                <div>
                                    <label className="field-label" htmlFor="doc-email">Work email</label>
                                    <input id="doc-email" className="input-field" type="email" autoComplete="username" value={docEmail} onChange={e => setDocEmail(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="field-label" htmlFor="doc-pass">Password</label>
                                    <input id="doc-pass" className="input-field" type="password" autoComplete="current-password" value={docPassword} onChange={e => setDocPassword(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={18} />
                                </button>
                                <p className="field-hint" style={{ textAlign: 'center' }}>Demo account: priya@healthsync.com / doctor123</p>
                            </form>
                        ) : patientStep === 'phone' ? (
                            <form onSubmit={handleSendOTP} style={{ display: 'grid', gap: 18 }} noValidate>
                                <div>
                                    <label className="field-label" htmlFor="phone">Mobile number</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <span className="input-field" style={{ width: 64, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }} aria-hidden="true">+91</span>
                                        <input id="phone" className="input-field" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                                            value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} required />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Sending code…' : 'Send code'} <ArrowRight size={18} />
                                </button>
                            </form>
                        ) : patientStep === 'otp' ? (
                            <form onSubmit={handleVerifyOTP} style={{ display: 'grid', gap: 18 }} noValidate>
                                <div>
                                    <label className="field-label" htmlFor="otp">4-digit code</label>
                                    <input id="otp" className="input-field" style={{ letterSpacing: '0.5em', fontSize: 20, textAlign: 'center' }} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4}
                                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required />
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Verifying…' : 'Verify and continue'}
                                </button>
                                <button type="button" className="btn-ghost" onClick={() => { setPatientStep('phone'); setOtp(''); }}>
                                    <ArrowLeft size={16} /> Change number
                                </button>
                            </form>
                        ) : patientStep === 'profile' ? (
                            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 18 }} noValidate>
                                <div>
                                    <label className="field-label" htmlFor="name">Full name</label>
                                    <input id="name" className="input-field" autoComplete="name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                                    <div>
                                        <label className="field-label" htmlFor="age">Age</label>
                                        <input id="age" className="input-field" type="number" inputMode="numeric" min={1} max={120} value={profile.age} onChange={e => setProfile({ ...profile, age: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="field-label" htmlFor="location">City <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                        <input id="location" className="input-field" autoComplete="address-level2" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} />
                                    </div>
                                </div>
                                <fieldset style={{ border: 0 }}>
                                    <legend className="field-label">Gender</legend>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {GENDERS.map(g => (
                                            <label key={g.value} className="choice">
                                                <input type="radio" name="gender" value={g.value} checked={profile.gender === g.value} onChange={() => setProfile({ ...profile, gender: g.value })} />
                                                {g.label}
                                            </label>
                                        ))}
                                    </div>
                                    <p className="field-hint">Used to show the right body model and ask relevant questions.</p>
                                </fieldset>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Saving…' : 'Continue'} <ArrowRight size={18} />
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleStartJourney} style={{ display: 'grid', gap: 14 }} noValidate>
                                <fieldset style={{ border: 0, display: 'grid', gap: 8 }}>
                                    <legend className="sr-only">Reason for visit</legend>
                                    {REASONS.map(r => (
                                        <label key={r} className="choice">
                                            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                                            {r}
                                        </label>
                                    ))}
                                </fieldset>
                                {reason === 'Other' && (
                                    <div>
                                        <label className="field-label" htmlFor="custom-reason">Describe briefly</label>
                                        <textarea id="custom-reason" className="input-field" value={customReason} onChange={e => setCustomReason(e.target.value)} style={{ minHeight: 88, resize: 'vertical' }} required />
                                    </div>
                                )}
                                <button type="submit" className="btn-primary" disabled={loading || !reason}>
                                    {loading ? 'Starting…' : 'Start check-in'} <ArrowRight size={18} />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
