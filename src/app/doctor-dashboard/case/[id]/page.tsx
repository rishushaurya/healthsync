'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Plus, Trash2, Video, Mic, Loader2, AlertTriangle, FileText, HeartPulse, ClipboardList, Activity } from 'lucide-react';
import {
    findJourney, getCarePlan, getCurrentDoctor, getPatientData, getTranscript, getCheckins, recoveryRate,
    type JourneyWithPatient, type CarePlanDraft, type DoctorAccount, type Vital, type MedicalReport, type TranscriptLine, type RecoveryCheckin,
} from '@/lib/store';
import { approveCarePlan, createCarePlanDraft } from '@/lib/care-plan';

type Medicine = CarePlanDraft['medicines'][number];
const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' };
const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

export default function DoctorCaseReviewPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [journey, setJourney] = useState<JourneyWithPatient | null>(null);
    const [plan, setPlan] = useState<CarePlanDraft | null>(null);
    const [vitals, setVitals] = useState<Vital[]>([]);
    const [reports, setReports] = useState<MedicalReport[]>([]);
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [checkins, setCheckins] = useState<RecoveryCheckin[]>([]);
    const [intake, setIntake] = useState<{ chiefComplaint?: string; hpi?: string; redFlags?: string[] } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);

    const load = () => {
        const doc = getCurrentDoctor();
        const j = findJourney(id);
        if (!doc || !j) { setNotFound(true); return; }
        const data = getPatientData(j.patient.id, doc.id);
        setDoctor(doc);
        setJourney(j);
        setPlan(prev => prev && prev.id === j.draftCarePlanId && prev.status === 'draft' ? prev : getCarePlan(j)); // keep unsaved edits
        setVitals(((data?.vitals || []) as Vital[]).slice(-8).reverse());
        setReports((data?.reports || []) as MedicalReport[]);
        setIntake(data?.intakeSummaries.at(-1) || null);
        setTranscript(getTranscript(j.id));
        setCheckins(getCheckins(j.id));
    };

    useEffect(load, [id]);

    if (notFound) return <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>This case isn’t available. It may belong to another doctor.</p>;
    if (!journey || !doctor) return <div className="spinner" style={{ margin: '60px auto' }} />;

    const p = journey.patient;
    const approved = plan?.status === 'approved';
    const online = journey.consultationMode !== 'Physical';
    const rate = recoveryRate(checkins);

    const update = (patch: Partial<CarePlanDraft>) => setPlan(prev => prev && { ...prev, ...patch });
    const updateMed = (i: number, patch: Partial<Medicine>) => update({ medicines: plan!.medicines.map((m, j) => j === i ? { ...m, ...patch } : m) });

    const draftFromRecords = async () => {
        setBusy(true);
        setError('');
        try {
            await createCarePlanDraft(journey, doctor, online ? 'online' : 'physical', new Date().toISOString());
            load();
        } catch { setError('Could not draft the care plan. Try again.'); }
        setBusy(false);
    };

    const approve = () => {
        if (!plan) return;
        const meds = plan.medicines.filter(m => m.name.trim());
        if (meds.some(m => !m.dosage.trim() || !m.frequency.trim())) {
            setError('Every medicine needs a dose and when to take it.');
            return;
        }
        approveCarePlan(journey, doctor, { ...plan, medicines: meds });
        router.push('/doctor-dashboard');
    };

    return (
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <Link href="/doctor-dashboard" className="btn-ghost" style={{ marginBottom: 12, paddingLeft: 0 }}><ArrowLeft size={16} /> Dashboard</Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">{p.name}</h1>
                    <p className="page-subtitle">{[p.age && `${p.age} yrs`, p.gender, p.phone].filter(Boolean).join(' · ')} — {journey.reasonForVisit || 'Consultation'} ({journey.pathway || 'Allopathic'})</p>
                </div>
                {approved
                    ? <span className="status-badge status-verified"><BadgeCheck size={14} /> Approved and sent</span>
                    : plan ? <span className="status-badge status-pending"><AlertTriangle size={14} /> Awaiting your approval</span>
                        : <span className="status-badge status-active">Consultation pending</span>}
            </div>

            {journey.redFlagDetected && (
                <div className="triage-red" role="alert" style={{ padding: 14, borderRadius: 10, marginTop: 16, display: 'flex', gap: 10 }}>
                    <AlertTriangle size={18} color="var(--color-danger)" /> Patient reported warning-sign symptoms during check-in{intake?.redFlags?.length ? `: ${intake.redFlags.join(', ')}` : ''}.
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 18, alignItems: 'start' }}>
                {/* Pre-consultation record */}
                <div style={{ display: 'grid', gap: 16 }}>
                    <section className="card" style={{ padding: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><ClipboardList size={18} /> Check-in</h2>
                        <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', marginTop: 12, fontSize: 14.5 }}>
                            {intake?.chiefComplaint && <><dt style={{ color: 'var(--text-muted)' }}>Complaint</dt><dd>{intake.chiefComplaint}</dd></>}
                            {intake?.hpi && <><dt style={{ color: 'var(--text-muted)' }}>History</dt><dd>{intake.hpi}</dd></>}
                            {!intake && journey.physicianSummary && <><dt style={{ color: 'var(--text-muted)' }}>Summary</dt><dd>{journey.physicianSummary}</dd></>}
                            {Object.entries(journey.intakeAnswers || {}).map(([k, v]) => (
                                <div key={k} style={{ display: 'contents' }}><dt style={{ color: 'var(--text-muted)' }}>{label(k)}</dt><dd>{String(v)}</dd></div>
                            ))}
                        </dl>
                    </section>

                    <section className="card" style={{ padding: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><HeartPulse size={18} /> Recent vitals</h2>
                        {vitals.length === 0 ? <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>No vitals logged.</p> : (
                            <ul style={{ listStyle: 'none', marginTop: 10, display: 'grid', gap: 6, fontSize: 14.5 }}>
                                {vitals.map(v => <li key={v.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{label(v.type)} · {v.date}</span><strong>{v.value} {v.unit}</strong></li>)}
                            </ul>
                        )}
                    </section>

                    <section className="card" style={{ padding: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><FileText size={18} /> Shared reports ({reports.length})</h2>
                        {reports.map(r => (
                            <div key={r.id} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)', fontSize: 14.5 }}>
                                <strong>{r.fileName}</strong> <span className={`status-badge triage-${r.urgencyLevel || 'green'}`} style={{ marginLeft: 6 }}>{r.urgencyLevel || 'green'}</span>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{r.technicalSummary || r.aiSummary}</p>
                                {r.abnormalities?.length > 0 && <p style={{ marginTop: 4 }}><strong>Abnormal:</strong> {r.abnormalities.join(', ')}</p>}
                            </div>
                        ))}
                    </section>

                    {transcript.length > 0 && (
                        <details className="card" style={{ padding: 20 }}>
                            <summary style={{ fontWeight: 700, cursor: 'pointer' }}>Consultation transcript ({transcript.length} lines, recorded with consent)</summary>
                            <div style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 14, maxHeight: 320, overflowY: 'auto' }}>
                                {transcript.map((l, i) => <p key={i}><strong style={{ textTransform: 'capitalize' }}>{l.speaker}:</strong> {l.text}</p>)}
                            </div>
                        </details>
                    )}
                </div>

                {/* Care plan */}
                <div style={{ display: 'grid', gap: 16 }}>
                    {!plan ? (
                        <section className="card" style={{ padding: 22 }}>
                            <h2 style={{ fontSize: 17, fontWeight: 700 }}>No care plan yet</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Hold the {online ? 'video consultation' : 'in-person visit'} with recording consent; the AI draft appears here for your approval.</p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                                {online
                                    ? <Link href={`/doctor-dashboard/calls?patient=${p.id}`} className="btn-primary"><Video size={17} /> Start video consultation</Link>
                                    : <Link href={`/doctor-dashboard/recorder?patient=${p.id}`} className="btn-primary"><Mic size={17} /> Open recorder</Link>}
                                <button onClick={draftFromRecords} className="btn-secondary" disabled={busy}>
                                    {busy && <Loader2 size={16} className="animate-spin" />} Draft from records only
                                </button>
                            </div>
                            {error && <p role="alert" style={{ color: 'var(--color-danger)', marginTop: 12 }}>{error}</p>}
                        </section>
                    ) : (
                        <section className="card" style={{ padding: 22 }}>
                            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{approved ? 'Approved care plan' : 'AI draft — review, edit and sign'}</h2>
                            {!approved && <p className="field-hint">Drafted from the consultation{transcript.length ? ' transcript' : ''} and the patient’s record. Nothing reaches the patient until you approve.</p>}

                            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                                <div>
                                    <label className="field-label" htmlFor="dx">Diagnosis</label>
                                    <input id="dx" className="input-field" value={plan.diagnosis || ''} onChange={e => update({ diagnosis: e.target.value })} disabled={approved} />
                                </div>
                                {plan.summary && (
                                    <div>
                                        <span className="field-label">Consultation summary</span>
                                        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', background: 'var(--bg-glass)', padding: 12, borderRadius: 8 }}>{plan.summary}</p>
                                    </div>
                                )}

                                <fieldset style={{ border: 0, display: 'grid', gap: 10 }}>
                                    <legend className="field-label">Medicines</legend>
                                    {plan.medicines.map((m, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 1.4fr 0.8fr auto', gap: 6, alignItems: 'center' }}>
                                            <input aria-label="Medicine" className="input-field" placeholder="Medicine" value={m.name} onChange={e => updateMed(i, { name: e.target.value })} disabled={approved} />
                                            <input aria-label="Dose" className="input-field" placeholder="Dose" value={m.dosage} onChange={e => updateMed(i, { dosage: e.target.value })} disabled={approved} />
                                            <input aria-label="When to take" className="input-field" placeholder="When (e.g. 8 AM, 8 PM)" value={m.frequency} onChange={e => updateMed(i, { frequency: e.target.value })} disabled={approved} />
                                            <input aria-label="Duration" className="input-field" placeholder="Days" value={m.duration} onChange={e => updateMed(i, { duration: e.target.value })} disabled={approved} />
                                            {!approved && <button type="button" className="btn-ghost" aria-label={`Remove ${m.name || 'medicine'}`} onClick={() => update({ medicines: plan.medicines.filter((_, j) => j !== i) })} style={{ padding: 8, color: 'var(--color-danger)' }}><Trash2 size={17} /></button>}
                                            {m.notes && <span style={{ gridColumn: '1 / -1', fontSize: 13, color: m.notes.startsWith('AI suggestion') ? 'var(--color-warning)' : 'var(--text-muted)', marginTop: -2 }}>{m.notes}</span>}
                                        </div>
                                    ))}
                                    {!approved && <button type="button" className="btn-ghost" onClick={() => update({ medicines: [...plan.medicines, { ...EMPTY_MED }] })} style={{ justifySelf: 'start' }}><Plus size={16} /> Add medicine</button>}
                                </fieldset>

                                {([['dietGuidance', 'Diet'], ['lifestyleGuidance', 'Exercise & activity'], ['generalInstructions', 'Instructions & warning signs']] as const).map(([key, title]) => (
                                    <div key={key}>
                                        <label className="field-label" htmlFor={key}>{title}</label>
                                        <textarea id={key} className="input-field" rows={3} value={plan[key]} onChange={e => update({ [key]: e.target.value })} disabled={approved} style={{ resize: 'vertical' }} />
                                    </div>
                                ))}

                                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
                                    <div>
                                        <label className="field-label" htmlFor="fu">Follow-up in</label>
                                        <select id="fu" className="input-field" value={plan.followUpDays} onChange={e => update({ followUpDays: Number(e.target.value) })} disabled={approved}>
                                            {[3, 7, 14, 21, 30].map(d => <option key={d} value={d}>{d} days</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="field-label" htmlFor="notes">Note to patient</label>
                                        <input id="notes" className="input-field" value={plan.doctorNotes || ''} onChange={e => update({ doctorNotes: e.target.value })} disabled={approved} />
                                    </div>
                                </div>

                                {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
                                {!approved && (
                                    <button onClick={approve} className="btn-primary" style={{ fontSize: 16 }}>
                                        <BadgeCheck size={19} /> Approve, sign and send to patient
                                    </button>
                                )}
                                {!approved && <p className="field-hint" style={{ textAlign: 'center', marginTop: -6 }}>Sends the plan and prescription to the patient and adds the medicines to their cart.</p>}
                            </div>
                        </section>
                    )}

                    {approved && (
                        <section className="card" style={{ padding: 22 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><Activity size={18} /> Recovery</h2>
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--color-primary)' }}>{rate === null ? '—' : `${rate}%`}</span>
                            </div>
                            <p className="field-hint">Recovery rate from the patient’s daily check-ins (last 7). Follow-up due {plan?.followUpDate}.</p>
                            {checkins.length === 0 ? <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>No check-ins yet.</p> : (
                                <ul style={{ listStyle: 'none', display: 'grid', gap: 6, marginTop: 12, fontSize: 14.5 }}>
                                    {checkins.slice().reverse().map(c => (
                                        <li key={c.date} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{c.date}</span><span>Feeling {c.feeling}/5 · medicines {c.tookMedicines ? 'taken' : <strong style={{ color: 'var(--color-warning)' }}>missed</strong>}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
