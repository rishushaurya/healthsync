'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Mic, Square, Loader2, Save, Play, CheckCircle, AlertCircle, FileText, User, ClipboardCheck 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getCurrentDoctor, getDoctorAppointments, getAllUsers, getDoctorJourneys, getConsent, setConsent,
    addDoctorNote, generateId, type DoctorAccount
} from '@/lib/store';
import { cloudAppendTranscript } from '@/lib/shared-store';
import { createCarePlanDraft } from '@/lib/care-plan';

export default function AppointmentRecorderPage() {
    const [doctor, setDoctor] = useState<DoctorAccount | null>(null);
    const [patients, setPatients] = useState<{ id: string; name: string; email: string }[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const router = useRouter();
    const [, rerender] = useState(0);
    const [drafting, setDrafting] = useState(false);
    // Physical visit in a patient's journey: transcript lines also go to the shared consultation record
    const journeyIdRef = useRef<string | null>(null);
    const startedAtRef = useRef(new Date().toISOString());

    useEffect(() => {
        const doc = getCurrentDoctor();
        if (!doc) return;
        setDoctor(doc);

        // Get unique patients for this doctor
        const appointments = getDoctorAppointments(doc.id);
        const allUsers = getAllUsers();
        const patientMap = new Map();
        
        appointments.forEach(apt => {
            if (!patientMap.has(apt.userId)) {
                const user = allUsers.find(u => u.id === apt.userId);
                patientMap.set(apt.userId, {
                    id: apt.userId,
                    name: apt.patientName || user?.name || 'Unknown',
                    email: user?.email || 'N/A'
                });
            }
        });
        
        setPatients(Array.from(patientMap.values()));
        const urlPatient = new URLSearchParams(window.location.search).get('patient');
        if (urlPatient) setSelectedPatient(urlPatient);
        
        // Initialize SpeechRecognition if available
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US'; // Or support multiple languages

                recognition.onresult = (event: any) => {
                    let currentInterim = '';
                    let finalTranscripts = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcriptSegment = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscripts += transcriptSegment + ' ';
                        } else {
                            currentInterim += transcriptSegment;
                        }
                    }

                    setInterimTranscript(currentInterim);
                    if (finalTranscripts) {
                        setTranscript(prev => prev + finalTranscripts);
                        if (journeyIdRef.current) cloudAppendTranscript(journeyIdRef.current, { speaker: 'room', text: finalTranscripts.trim(), at: new Date().toISOString() });
                    }
                };

                recognition.onerror = (event: any) => {
                    console.warn('Speech recognition error', event.error);
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        setError(`Microphone error: ${event.error}. Please check permissions.`);
                    }
                    setIsRecording(false);
                    isRecordingRef.current = false;
                };
                
                recognition.onend = () => {
                    // Continuous recording might stop automatically, we can restart it if it was not intentionally stopped
                    if (isRecordingRef.current) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.warn("Could not restart recognition", e);
                        }
                    }
                };

                recognitionRef.current = recognition;
            } else {
                setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
            }
        }
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            setError('Speech recognition not available.');
            return;
        }

        if (!isRecording && journey && !(consent.patient && consent.doctor)) {
            setError('Recording needs both the patient’s and your consent for this consultation.');
            return;
        }
        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
            isRecordingRef.current = false;
        } else {
            setError('');
            setSuccessMessage('');
            if (!transcript) setInterimTranscript('');
            try {
                isRecordingRef.current = true;
                if (!transcript) startedAtRef.current = new Date().toISOString();
                setIsRecording(true);
                recognitionRef.current.start();
            } catch (err) {
                console.warn(err);
                setIsRecording(false);
                isRecordingRef.current = false;
            }
        }
    };

    const clearTranscript = () => {
        if (isRecording) toggleRecording();
        setTranscript('');
        setInterimTranscript('');
        setAiSummary('');
        setSuccessMessage('');
    };

    const analyzeTranscript = async () => {
        if (!transcript.trim()) {
            setError('No transcript available to analyze.');
            return;
        }
        
        if (isRecording) {
            toggleRecording();
        }

        setIsAnalyzing(true);
        setError('');
        
        try {
            const patientData = patients.find(p => p.id === selectedPatient);
            const context = patientData ? `Patient Name: ${patientData.name}` : '';

            const res = await fetch('/api/ai/analyze-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    transcript: transcript.trim(),
                    patientContext: context 
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to analyze transcript');
            
            setAiSummary(data.summary);
        } catch (err: any) {
            setError(err.message || 'An error occurred during analysis.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const journey = doctor && selectedPatient
        ? getDoctorJourneys(doctor.id).find(j => j.patient.id === selectedPatient && !j.verified)
        : undefined;
    const consent = journey ? getConsent(journey.id) : { patient: false, doctor: false };
    useEffect(() => {
        journeyIdRef.current = journey && consent.patient && consent.doctor ? journey.id : null;
    });
    // Pick up a patient consenting from their own app
    useEffect(() => {
        const id = setInterval(() => rerender(n => n + 1), 3000);
        return () => clearInterval(id);
    }, []);

    const draftCarePlan = async () => {
        if (!doctor || !journey) return;
        if (isRecording) toggleRecording();
        setDrafting(true);
        setError('');
        try {
            await createCarePlanDraft(journey, doctor, 'physical', startedAtRef.current);
            router.push(`/doctor-dashboard/case/${journey.id}`);
        } catch {
            setError('Could not draft the care plan. Try again.');
            setDrafting(false);
        }
    };

    const saveToPatientNotes = () => {
        if (!doctor || !selectedPatient || !aiSummary) return;

        const patient = patients.find(p => p.id === selectedPatient);
        if (!patient) return;

        const note = {
            id: generateId(),
            doctorId: doctor.id,
            patientId: patient.id,
            patientName: patient.name,
            date: new Date().toISOString(),
            content: `**AI Appointment Summary:**\n\n${aiSummary}\n\n---\n**Raw Transcript:**\n${transcript}`,
            type: 'consultation' as const
        };

        addDoctorNote(note);
        setSuccessMessage('Summary successfully saved to patient notes.');
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mic color="var(--color-primary)" /> Consultation recorder
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    For in-person visits: record with consent, then draft the patient’s care plan for your approval.
                </p>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {successMessage && (
                <div style={{ padding: '12px 16px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <CheckCircle size={16} /> {successMessage}
                </div>
            )}

            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Select Patient for this Consultation
                    </label>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <User size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
                            <select 
                                className="input-field" 
                                style={{ paddingLeft: 42, width: '100%' }}
                                value={selectedPatient}
                                onChange={(e) => setSelectedPatient(e.target.value)}
                            >
                                <option value="" disabled>Select a patient...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {journey && (
                        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', display: 'grid', gap: 8, fontSize: 14.5 }}>
                            <strong>Recording consent · {journey.reasonForVisit || 'consultation'}</strong>
                            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input type="checkbox" checked={consent.patient} onChange={e => { setConsent(journey.id, 'patient', e.target.checked); rerender(n => n + 1); }} style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }} />
                                Patient has given consent (in their app or verbally to me)
                            </label>
                            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input type="checkbox" checked={consent.doctor} onChange={e => { setConsent(journey.id, 'doctor', e.target.checked); rerender(n => n + 1); }} style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }} />
                                I consent to recording this consultation
                            </label>
                        </div>
                    )}
                </div>

                <div style={{
                    background: 'var(--bg-secondary)',  
                    borderRadius: 16, 
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        padding: '16px 20px', 
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {isRecording && (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626' }}
                                />
                            )}
                            <span style={{ fontWeight: 600, fontSize: 14 }}>
                                {isRecording ? 'Listening...' : 'Ready to record'}
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                                onClick={clearTranscript} 
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 13 }}
                                disabled={!transcript && !interimTranscript && !isRecording}
                            >
                                Clear
                            </button>
                            <button 
                                onClick={toggleRecording} 
                                style={{ 
                                    padding: '6px 16px', 
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: isRecording ? '#DC2626' : 'var(--color-primary)',
                                    color: 'white'
                                }}
                            >
                                {isRecording ? (
                                    <><Square size={14} fill="currentColor" /> Stop Recording</>
                                ) : (
                                    <><Mic size={14} /> Start Recording</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={{ 
                        padding: 20, 
                        minHeight: 200, 
                        maxHeight: 400, 
                        overflowY: 'auto',
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: 'var(--text-primary)'
                    }}>
                        {!transcript && !interimTranscript && !isRecording && (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60 }}>
                                <Mic size={48} style={{ opacity: 0.2, marginBottom: 12, margin: '0 auto' }} />
                                <p>Click "Start Recording" to begin the consultation transcript.</p>
                            </div>
                        )}
                        
                        <div>{transcript}</div>
                        {interimTranscript && (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                 {interimTranscript}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                    {journey && (
                        <button className="btn-primary" onClick={draftCarePlan} disabled={drafting || !transcript.trim()}>
                            {drafting ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} Draft care plan for my approval
                        </button>
                    )}
                    <button
                        className={journey ? 'btn-secondary' : 'btn-primary'}
                        onClick={analyzeTranscript}
                        disabled={!transcript.trim() || isAnalyzing || isRecording}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: (!transcript.trim() || isAnalyzing || isRecording) ? 0.6 : 1 }}
                    >
                        {isAnalyzing ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
                        Analyze & Summarize
                    </button>
                </div>
            </div>

            {aiSummary && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card" 
                    style={{ padding: 24 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClipboardCheck size={20} /> Consultation Summary
                        </h2>
                        
                        <button 
                            className="btn-primary" 
                            onClick={saveToPatientNotes}
                            disabled={!selectedPatient}
                            style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Save size={14} /> Save to Patient Notes
                        </button>
                    </div>

                    {!selectedPatient && (
                        <div style={{ padding: '8px 12px', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                            Please select a patient at the top to save this summary to their records.
                        </div>
                    )}

                    <div 
                        className="markdown-body"
                        style={{ 
                            background: 'var(--bg-secondary)', 
                            padding: 20, 
                            borderRadius: 12,
                            fontSize: 14,
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap'
                        }}
                    >
                        {aiSummary}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
