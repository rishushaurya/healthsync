'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mic, Upload, FileText, Loader2, ArrowRight, Stethoscope, AlertTriangle, PhoneCall, Star, Send } from 'lucide-react';
import { generateId, saveIntakeSummary, getCurrentUser, getActiveJourney, saveJourney, JourneyStep, type ClinicalIntakeSummary, type PatientJourney } from '@/lib/store';
import { getPatientByAbhaId, type AbhaPatient } from '@/lib/abhaDb';
import { matchDoctors } from '@/lib/data';
import { useSpeechInput } from '@/hooks/useSpeechInput';

type KioskStep = 'CONSENT' | 'CONVERSE' | 'SCAN' | 'SUMMARIZE' | 'RESULT';

export default function KioskPage() {
    const router = useRouter();
    const [step, setStep] = useState<KioskStep>('CONSENT');
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [abhaId, setAbhaId] = useState('');
    const [consented, setConsented] = useState(false);
    const [patientContext, setPatientContext] = useState<AbhaPatient | null>(null);
    const [consultationType, setConsultationType] = useState<'Allopathic' | 'AYUSH'>('Allopathic');

    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [intakeComplete, setIntakeComplete] = useState(false);
    const [documents, setDocuments] = useState<{ name: string; text: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [summary, setSummary] = useState<ClinicalIntakeSummary | null>(null);
    const [error, setError] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const speech = useSpeechInput(text => setInputValue(text));

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) { router.push('/auth'); return; }
        const j = getActiveJourney(user.id);
        if (!j) { router.push('/auth'); return; }
        setJourney(j);
        if (j.pathway === 'AYUSH') setConsultationType('AYUSH');
    }, [router]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleConsent = () => {
        const found = abhaId.trim() ? getPatientByAbhaId(abhaId.trim()) : null;
        setPatientContext(found || null);
        const user = getCurrentUser();
        setMessages([{
            role: 'ai',
            content: found
                ? `Hello ${found.name}. Your ABHA record shows blood group ${found.bloodGroup}${found.medicalHistory ? ` and a history of ${found.medicalHistory}` : ''}. What brings you in today?`
                : `Hello ${user?.name.split(' ')[0] || ''}. Tell me what’s bothering you, in your own words.`,
        }]);
        setStep('CONVERSE');
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || chatLoading) return;
        const newMessages = [...messages, { role: 'user' as const, content: inputValue.trim() }];
        setMessages(newMessages);
        setInputValue('');
        setChatLoading(true);
        try {
            const res = await fetch('/api/ai/intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, consultationType, patientContext: patientContext ? JSON.stringify(patientContext) : undefined }),
            });
            const data = await res.json();
            if (data.error || !data.response) throw new Error(data.error);
            setMessages([...newMessages, { role: 'ai', content: data.response }]);
            if (data.status === 'COMPLETE') setIntakeComplete(true);
        } catch {
            setMessages([...newMessages, { role: 'ai', content: 'Sorry, I couldn’t process that. Could you say it again?' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const readFile = (file: File): Promise<string> => new Promise(resolve => {
        const reader = new FileReader();
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            reader.onload = e => {
                const base64 = e.target?.result as string;
                resolve(`[BASE64]${base64.split(',')[1] || base64}[/BASE64]\nFile: ${file.name}`);
            };
            reader.readAsDataURL(file);
        } else {
            reader.onload = e => resolve((e.target?.result as string) || '');
            reader.readAsText(file);
        }
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        const docs = await Promise.all(files.map(async f => ({ name: f.name, text: (await readFile(f)).substring(0, 3000) })));
        setDocuments(prev => [...prev, ...docs]);
        setUploading(false);
    };

    const finishScanning = async () => {
        if (!journey) return;
        setStep('SUMMARIZE');
        setError('');
        const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
        try {
            const res = await fetch('/api/ai/summarize-intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, documents, consultationType, patientContext: patientContext ? JSON.stringify(patientContext) : undefined }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const user = getCurrentUser();
            const final: ClinicalIntakeSummary = {
                id: generateId(), userId: journey.userId, patientName: patientContext?.name || user?.name || 'Unknown',
                abhaId: patientContext?.abhaId, date: new Date().toISOString(), consultationType, transcript, ...data,
            };
            saveIntakeSummary(final);
            saveJourney({
                ...journey, recommendedSpecialty: final.recommendedSpecialty, physicianSummary: `${final.chiefComplaint}. ${final.hpi}`,
                redFlagDetected: journey.redFlagDetected || final.redFlags?.length > 0,
                currentStep: JourneyStep.BOOKING, updatedAt: new Date().toISOString(),
            });
            setSummary(final);
            setStep('RESULT');
        } catch {
            setError('We couldn’t create your summary. Please try again.');
            setStep('SCAN');
        }
    };

    const doctors = matchDoctors(summary?.recommendedSpecialty, journey?.pathway);

    if (!journey) return null;

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Stethoscope size={26} color="var(--color-primary)" /> MediKiosk</h1>
            <p className="page-subtitle">A guided interview about your problem. At the end you’ll get a recommended doctor to book.</p>

            {step === 'CONSENT' && (
                <section className="card" style={{ padding: 28, marginTop: 20, maxWidth: 600 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={22} color="var(--color-accent)" /> Before we start</h2>
                    <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
                        <div>
                            <label className="field-label" htmlFor="abha">ABHA ID <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                            <input id="abha" className="input-field" value={abhaId} onChange={e => setAbhaId(e.target.value)} placeholder="91-XXXX-XXXX-XXXX" />
                            <p className="field-hint">Links your existing government health record so you don’t repeat your history.</p>
                        </div>
                        <div>
                            <label className="field-label" htmlFor="ctype">Type of care</label>
                            <select id="ctype" className="input-field" value={consultationType} onChange={e => setConsultationType(e.target.value as 'Allopathic' | 'AYUSH')}>
                                <option value="Allopathic">Allopathic (modern medicine)</option>
                                <option value="AYUSH">AYUSH (Ayurveda, homeopathy)</option>
                            </select>
                        </div>
                        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 10, background: 'var(--accent-soft)', fontSize: 14.5 }}>
                            <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--color-accent)' }} />
                            I agree that my answers and documents are used to prepare a summary for my doctor, and stored in my health record as per the DPDP Act 2023.
                        </label>
                        <button onClick={handleConsent} className="btn-primary" disabled={!consented}>Start interview <ArrowRight size={18} /></button>
                    </div>
                </section>
            )}

            {step === 'CONVERSE' && (
                <section className="card" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', height: 'min(640px, calc(100vh - 260px))' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 700 }}>Interview</span>
                        <button onClick={() => setStep('SCAN')} className={intakeComplete ? 'btn-primary' : 'btn-ghost'} style={{ minHeight: 38, padding: '6px 14px', fontSize: 14 }}>
                            {intakeComplete ? 'Continue to documents' : 'Skip to documents'} <ArrowRight size={16} />
                        </button>
                    </div>
                    <div aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {messages.map((m, i) => (
                            <div key={i} className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ marginLeft: m.role === 'user' ? 'auto' : 0 }}>{m.content}</div>
                        ))}
                        {chatLoading && <div className="chat-bubble-ai"><Loader2 size={18} className="animate-spin" color="var(--color-primary)" /></div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} style={{ padding: 14, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
                        {speech.supported && (
                            <button type="button" onClick={speech.toggle} className={speech.listening ? 'btn-danger' : 'btn-secondary'} aria-label={speech.listening ? 'Stop voice input' : 'Speak your answer'} style={{ padding: '0 14px' }}>
                                <Mic size={20} />
                            </button>
                        )}
                        <label htmlFor="kiosk-msg" className="sr-only">Your message</label>
                        <input id="kiosk-msg" className="input-field" placeholder={speech.listening ? 'Listening…' : 'Type your answer…'} value={inputValue} onChange={e => setInputValue(e.target.value)} />
                        <button type="submit" className="btn-primary" disabled={!inputValue.trim() || chatLoading} aria-label="Send" style={{ padding: '0 18px' }}><Send size={18} /></button>
                    </form>
                </section>
            )}

            {step === 'SCAN' && (
                <section className="card" style={{ padding: 28, marginTop: 20, maxWidth: 640 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 700 }}>Add previous documents <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 15 }}>(optional)</span></h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Old prescriptions, lab reports or discharge summaries help your doctor.</p>
                    {error && <div role="alert" style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-soft)', color: 'var(--color-danger)' }}>{error}</div>}
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', marginTop: 18, padding: 32, border: '2px dashed var(--border-strong)', borderRadius: 12, background: 'var(--bg-glass)', font: 'inherit', color: 'var(--text-secondary)' }}>
                        {uploading ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} color="var(--color-primary)" />}
                        <span style={{ display: 'block', fontWeight: 600, marginTop: 8, color: 'var(--text-primary)' }}>{uploading ? 'Reading document…' : 'Choose files'}</span>
                        <span style={{ fontSize: 13 }}>PDF, JPG or PNG</span>
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} hidden />
                    {documents.length > 0 && (
                        <ul style={{ listStyle: 'none', display: 'grid', gap: 8, marginTop: 14 }}>
                            {documents.map((d, i) => <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5 }}><FileText size={16} color="var(--text-muted)" /> {d.name}</li>)}
                        </ul>
                    )}
                    <button onClick={finishScanning} className="btn-primary" style={{ width: '100%', marginTop: 20 }}>Get my summary and doctor <ArrowRight size={18} /></button>
                </section>
            )}

            {step === 'SUMMARIZE' && (
                <section role="status" style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 18px', width: 36, height: 36 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>Preparing your summary</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Organising your answers and documents for the doctor…</p>
                </section>
            )}

            {step === 'RESULT' && summary && (
                <section style={{ marginTop: 20, display: 'grid', gap: 16 }}>
                    {summary.redFlags?.length > 0 && (
                        <div className="triage-red" role="alert" style={{ padding: 18, borderRadius: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <AlertTriangle color="var(--color-danger)" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <strong>Warning signs noted:</strong> {summary.redFlags.join(', ')}. If you feel worse, don’t wait for your appointment.
                            </div>
                            <a href="tel:108" className="btn-danger" style={{ minHeight: 40, padding: '8px 14px' }}><PhoneCall size={16} /> 108</a>
                        </div>
                    )}
                    <div className="card" style={{ padding: 24 }}>
                        <span className="eyebrow">Your summary</span>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{summary.chiefComplaint}</h2>
                        {summary.explanation && <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>{summary.explanation}</p>}
                        <p className="field-hint" style={{ marginTop: 12 }}>This is not a diagnosis. Your doctor will confirm what’s going on.</p>
                    </div>
                    <div className="card" style={{ padding: 24 }}>
                        <span className="eyebrow">Recommended</span>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>See a {summary.recommendedSpecialty || 'General Physician'}</h2>
                        {summary.specialtyReason && <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{summary.specialtyReason}</p>}
                        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                            {doctors.map(d => (
                                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, border: '1px solid var(--border-color)', borderRadius: 10, flexWrap: 'wrap' }}>
                                    <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{d.initials}</span>
                                    <div style={{ flex: 1, minWidth: 180 }}>
                                        <div style={{ fontWeight: 700 }}>{d.name}</div>
                                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{d.specialty} · {d.hospital} · <Star size={13} style={{ verticalAlign: -2 }} color="#D97706" fill="#D97706" /> {d.rating} · {d.fee}</div>
                                    </div>
                                    <button onClick={() => router.push(`/journey/booking?doctor=${d.id}`)} className="btn-primary" style={{ minHeight: 40, padding: '8px 16px' }}>Book</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/journey/booking')} className="btn-ghost" style={{ marginTop: 10 }}>See all doctors</button>
                    </div>
                </section>
            )}
        </div>
    );
}
