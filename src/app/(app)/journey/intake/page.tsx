'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Leaf, ShieldAlert, CheckCircle2, Send, PhoneCall, Stethoscope, PersonStanding, ArrowRight } from 'lucide-react';
import { getCurrentUser, getActiveJourney, saveJourney, startJourney, isInProgress, sexOf, JourneyStep, type PatientJourney, type UserProfile } from '@/lib/store';

type Message = { role: 'ai' | 'user' | 'system'; text: string; options?: string[] };
type Question = { key: string; text: string; options: string[] };

const RED_FLAGS = ['chest pain', 'severe bleeding', 'difficulty breathing', 'can\'t breathe', 'stroke', 'heart attack', 'unconscious', 'fainted', 'seizure'];

// Questions adapt to pathway, sex and age so patients only answer what's relevant to them
function buildQuestions(pathway: 'Allopathic' | 'AYUSH', user: UserProfile): Question[] {
    const age = Number(user.age) || 0;
    const female = sexOf(user.gender) === 'female';

    const common: Question[] = pathway === 'Allopathic' ? [
        { key: 'symptoms', text: 'What symptoms are you having? Describe them or pick the closest.', options: ['Fever', 'Headache', 'Cough or cold', 'Stomach pain', 'Body or joint pain', 'Skin problem'] },
        { key: 'duration', text: 'When did this start?', options: ['Today', '2–3 days ago', 'About a week ago', 'More than 2 weeks ago'] },
        { key: 'severity', text: 'How much is it affecting your day?', options: ['Mild — I can do my usual tasks', 'Moderate — some tasks are hard', 'Severe — I can’t do my usual tasks'] },
        { key: 'pastHistory', text: 'Do you have any long-term conditions?', options: ['None', 'Diabetes', 'High blood pressure', 'Asthma', 'Thyroid', 'Heart disease'] },
        { key: 'medications', text: 'Are you taking any medicines, or allergic to any?', options: ['No medicines or allergies', 'Allergic to penicillin', 'On BP medicines', 'On diabetes medicines'] },
        { key: 'lifestyle', text: 'Do you smoke or drink alcohol?', options: ['Neither', 'I smoke', 'Occasional alcohol', 'Regular alcohol'] },
    ] : [
        { key: 'symptoms', text: 'What symptoms are you having? Describe them or pick the closest.', options: ['Joint pain', 'Digestive issues', 'Skin rash', 'Fatigue', 'Sleep issues'] },
        { key: 'duration', text: 'When did this start?', options: ['Today', '2–3 days ago', 'About a week ago', 'More than 2 weeks ago'] },
        { key: 'prakriti', text: 'How would you describe your natural body type (Prakriti)?', options: ['Vata — thin, active, dry skin', 'Pitta — medium build, feels warm, intense', 'Kapha — solid build, calm, feels cool'] },
        { key: 'vikriti', text: 'What imbalance do you feel right now (Vikriti)?', options: ['Heat or acidity', 'Dryness or anxiety', 'Heaviness or lethargy'] },
        { key: 'agni', text: 'How is your digestion (Agni)?', options: ['Strong and regular', 'Variable — gas or bloating', 'Slow and sluggish'] },
        { key: 'aharaVihara', text: 'How are your recent diet and routine (Ahara-Vihara)?', options: ['Eating well, active', 'Skipping meals, stressed', 'Heavy food, inactive'] },
    ];

    const extra: Question[] = [];
    if (age > 0 && age < 14) extra.push({ key: 'guardian', text: 'Is a parent or guardian answering for the child?', options: ['Yes, I’m the parent/guardian', 'No'] });
    if (female && age >= 12 && age <= 55) extra.push({ key: 'pregnancy', text: 'Are you pregnant, or could you be? This changes which medicines are safe.', options: ['No', 'Yes', 'Not sure', 'Breastfeeding'] });
    if (age >= 60) extra.push({ key: 'fallsDizziness', text: 'Have you had any falls, dizziness or unsteadiness recently?', options: ['No', 'Dizziness', 'A fall', 'Both'] });

    // Ask safety questions right after symptom severity/duration
    return [...common.slice(0, 3), ...extra, ...common.slice(3)];
}

export default function IntakePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [pathway, setPathway] = useState<'Allopathic' | 'AYUSH' | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [stage, setStage] = useState<'pathway' | 'interview' | 'choose'>('pathway');
    const [redFlag, setRedFlag] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [questionIndex, setQuestionIndex] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const u = getCurrentUser();
        if (!u) { router.push('/auth'); return; }
        // Sidebar "New check-in" lands here: resume an unfinished journey or open a fresh one
        const active = getActiveJourney(u.id);
        setUser(u);
        setJourney(active && isInProgress(active) ? active : startJourney(u.id, 'New check-in'));
    }, [router]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const selectPathway = (type: 'Allopathic' | 'AYUSH') => {
        if (!user) return;
        const qs = buildQuestions(type, user);
        setPathway(type);
        setQuestions(qs);
        setStage('interview');
        const intro = `Hello ${user.name.split(' ')[0]}.${journey?.reasonForVisit ? ` You're here for: ${journey.reasonForVisit}.` : ''} `;
        setMessages([{ role: 'ai', text: intro + qs[0].text, options: qs[0].options }]);
    };

    const handleSend = (text: string) => {
        if (!text.trim() || !journey) return;

        if (RED_FLAGS.some(f => text.toLowerCase().includes(f))) {
            saveJourney({ ...journey, redFlagDetected: true, updatedAt: new Date().toISOString() });
            setRedFlag(true);
        }

        const q = questions[questionIndex];
        setMessages(prev => [...prev, { role: 'user', text }]);
        setInput('');
        setAnswers(prev => ({ ...prev, [q.key]: text }));

        setTimeout(() => {
            const next = questions[questionIndex + 1];
            if (next) {
                setQuestionIndex(questionIndex + 1);
                setMessages(prev => [...prev, { role: 'ai', text: next.text, options: next.options }]);
            } else {
                setMessages(prev => [...prev, { role: 'system', text: 'History saved' }]);
                setTimeout(() => setStage('choose'), 600);
            }
        }, 400);
    };

    // Workflow fork: MediKiosk if the patient knows the issue, Digital Twin if unsure
    const continueTo = (path: 'medikiosk' | 'digital-twin') => {
        if (!journey) return;
        const updated = {
            ...journey,
            pathway: pathway || undefined,
            intakeAnswers: answers,
            currentStep: path === 'medikiosk' ? JourneyStep.MEDIKIOSK : JourneyStep.DIGITAL_TWIN,
            updatedAt: new Date().toISOString(),
        };
        saveJourney(updated);
        router.push(`/journey/${path}`);
    };

    if (!user || !journey) return null;

    if (redFlag) {
        return (
            <div className="card" role="alertdialog" aria-labelledby="rf-title" style={{ maxWidth: 560, margin: '40px auto', padding: 32, borderColor: 'var(--color-danger)', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--danger-soft)', color: 'var(--color-danger)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                    <ShieldAlert size={32} />
                </div>
                <h1 id="rf-title" style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-danger)' }}>This may need urgent care</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>
                    What you described can be a sign of a medical emergency. If symptoms are severe or getting worse, call an ambulance now.
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                    <a href="tel:108" className="btn-danger" style={{ fontSize: 17 }}><PhoneCall size={20} /> Call 108 ambulance</a>
                    <button onClick={() => router.push('/emergency')} className="btn-secondary">Open emergency SOS</button>
                    <button onClick={() => setRedFlag(false)} className="btn-ghost">It’s not an emergency — continue check-in</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <h1 className="page-title">Your medical history</h1>
            <p className="page-subtitle">A few quick questions so your doctor has the full picture before you meet.</p>

            {stage === 'pathway' && (
                <section className="card" style={{ padding: 28, marginTop: 20 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 700 }}>Which kind of care would you like?</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 18 }}>
                        {[
                            { type: 'Allopathic' as const, Icon: Activity, title: 'Allopathic', desc: 'Modern medicine — general physicians and specialists.' },
                            { type: 'AYUSH' as const, Icon: Leaf, title: 'AYUSH', desc: 'Ayurveda and homeopathy practitioners.' },
                        ].map(({ type, Icon, title, desc }) => (
                            <button key={type} onClick={() => selectPathway(type)} className="glass-card" style={{ padding: 22, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
                                <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center' }}><Icon size={22} /></span>
                                <span style={{ display: 'block', fontWeight: 700, fontSize: 17, marginTop: 14 }}>{title}</span>
                                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 14.5, marginTop: 4 }}>{desc}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 220 }}>Want to skip the questions?</span>
                        <button onClick={() => router.push('/journey/digital-twin')} className="btn-secondary"><PersonStanding size={17} /> Try Digital Twin</button>
                        <button onClick={() => router.push('/journey/medikiosk')} className="btn-secondary"><Stethoscope size={17} /> Use MediKiosk</button>
                    </div>
                </section>
            )}

            {stage === 'interview' && (
                <section className="card" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', height: 'min(640px, calc(100vh - 260px))' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-secondary)' }}>
                        Question {Math.min(questionIndex + 1, questions.length)} of {questions.length} · {pathway}
                    </div>
                    <div aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : m.role === 'system' ? 'center' : 'flex-start' }}>
                                {m.role === 'system'
                                    ? <span className="status-badge status-completed"><CheckCircle2 size={14} /> {m.text}</span>
                                    : <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ margin: 0 }}>{m.text}</div>}
                                {m.options && i === messages.length - 1 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                        {m.options.map(opt => (
                                            <button key={opt} onClick={() => handleSend(opt)} className="btn-secondary" style={{ minHeight: 40, padding: '8px 14px', fontSize: 14, borderRadius: 999 }}>{opt}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleSend(input); }} style={{ padding: 14, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
                        <label htmlFor="intake-answer" className="sr-only">Your answer</label>
                        <input id="intake-answer" className="input-field" value={input} onChange={e => setInput(e.target.value)} placeholder="Type your answer…" />
                        <button type="submit" className="btn-primary" aria-label="Send answer" style={{ padding: '0 18px' }}><Send size={18} /></button>
                    </form>
                </section>
            )}

            {stage === 'choose' && (
                <section style={{ marginTop: 20 }}>
                    <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                        <CheckCircle2 size={22} color="var(--color-accent)" />
                        <span><strong>History saved.</strong> Next, tell us more so we can match you with the right doctor.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        <button onClick={() => continueTo('medikiosk')} className="glass-card" style={{ padding: 26, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
                            <span style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center' }}><Stethoscope size={24} /></span>
                            <span style={{ display: 'block', fontWeight: 800, fontSize: 19, marginTop: 16 }}>MediKiosk</span>
                            <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: 6 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>I know what’s wrong.</strong> Answer a guided interview, add documents, and get a recommended doctor you can book right away.
                            </span>
                            <span className="btn-primary" style={{ marginTop: 18 }}>Start MediKiosk <ArrowRight size={17} /></span>
                        </button>
                        <button onClick={() => continueTo('digital-twin')} className="glass-card" style={{ padding: 26, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
                            <span style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--color-accent)', display: 'grid', placeItems: 'center' }}><PersonStanding size={24} /></span>
                            <span style={{ display: 'block', fontWeight: 800, fontSize: 19, marginTop: 16 }}>Digital Twin</span>
                            <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: 6 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>I’m not sure what’s wrong.</strong> Point to where it hurts on a 3D body, ask questions, learn what may be causing it and which doctor to see.
                            </span>
                            <span className="btn-secondary" style={{ marginTop: 18 }}>Open Digital Twin <ArrowRight size={17} /></span>
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
