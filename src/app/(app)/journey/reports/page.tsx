'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertTriangle, Loader2, ArrowRight, XCircle } from 'lucide-react';
import {
    getReports, addReport, generateId, getCurrentUser, getActiveJourney, saveJourney, autoShareReportsWithDoctor,
    JourneyStep, type MedicalReport, type PatientJourney,
} from '@/lib/store';
import { formatContextForAI, buildAIContext } from '@/lib/ai-context';

const URGENCY: Record<string, { cls: string; label: string }> = {
    red: { cls: 'triage-red', label: 'Needs attention soon' },
    amber: { cls: 'triage-amber', label: 'Discuss with your doctor' },
    green: { cls: 'triage-green', label: 'Mostly normal' },
};

const readFile = (file: File): Promise<string> => new Promise(resolve => {
    const reader = new FileReader();
    const tag = file.type.startsWith('image/') ? 'IMAGE_BASE64' : file.type === 'application/pdf' ? 'PDF_BASE64' : null;
    if (tag) {
        reader.onload = e => {
            const base64 = e.target?.result as string;
            resolve(`[${tag}]${base64.split(',')[1] || base64}[/${tag}]\nFile: ${file.name}\nType: ${file.type}`);
        };
        reader.readAsDataURL(file);
    } else {
        reader.onload = e => resolve((e.target?.result as string) || 'Unable to read file content');
        reader.readAsText(file);
    }
});

export default function JourneyReportsPage() {
    const router = useRouter();
    const [journey, setJourney] = useState<PatientJourney | null>(null);
    const [reports, setReportsList] = useState<MedicalReport[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [rejected, setRejected] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) { router.push('/auth'); return; }
        setJourney(getActiveJourney(user.id));
        setReportsList(getReports());
    }, [router]);

    const analyzeReport = async (file: File) => {
        setAnalyzing(true);
        setRejected('');
        try {
            const reportText = await readFile(file);
            const res = await fetch('/api/ai/analyze-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportText, fileName: file.name, userContext: formatContextForAI(buildAIContext()) }),
            });
            const { analysis, error } = await res.json();
            if (!analysis) throw new Error(error);
            if (analysis.isValidReport === false) {
                setRejected(analysis.validationMessage);
                return;
            }
            const user = getCurrentUser();
            addReport({
                id: generateId(), userId: user?.id || 'unknown', fileName: file.name, uploadDate: new Date().toISOString(),
                fileData: reportText.substring(0, 5000), aiSummary: analysis.laymanSummary || '', technicalSummary: analysis.technicalSummary || '',
                abnormalities: analysis.abnormalities || [], recommendations: analysis.recommendations || [],
                urgencyLevel: analysis.urgencyLevel || 'green', fileType: file.type, journeyId: journey?.id, sharedWith: [],
            });
            // The booked doctor sees reports before the consultation
            if (user && journey?.doctorId) autoShareReportsWithDoctor(user.id, journey.doctorId);
            setReportsList(getReports());
        } catch {
            setRejected('We couldn’t read that file. Try a clearer photo or a PDF.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleContinue = () => {
        if (journey) saveJourney({ ...journey, currentStep: JourneyStep.CONSULTATION, updatedAt: new Date().toISOString() });
        router.push('/journey/consultation');
    };

    const onFiles = (files: FileList | null) => { const f = files?.[0]; if (f) analyzeReport(f); };

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <h1 className="page-title">Reports for your doctor <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 18 }}>(optional)</span></h1>
            <p className="page-subtitle">Upload lab tests, scans or old prescriptions. Each one is read and explained, and shared with your doctor before you meet.</p>

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
                disabled={analyzing}
                style={{
                    width: '100%', marginTop: 20, padding: 36, borderRadius: 12, font: 'inherit', color: 'var(--text-secondary)',
                    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border-strong)'}`,
                    background: dragOver ? 'var(--primary-soft)' : 'var(--bg-card)',
                }}
            >
                {analyzing ? <Loader2 size={32} className="animate-spin" color="var(--color-primary)" /> : <Upload size={32} color="var(--color-primary)" />}
                <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-primary)', marginTop: 10 }}>{analyzing ? 'Reading your report…' : 'Drag a file here or choose one'}</span>
                <span style={{ fontSize: 14 }}>PDF, JPG or PNG</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.png,.jpeg,.txt" onChange={e => onFiles(e.target.files)} hidden />

            {rejected && (
                <div role="alert" className="triage-red" style={{ marginTop: 14, padding: 14, borderRadius: 10, display: 'flex', gap: 10 }}>
                    <XCircle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} /> {rejected}
                </div>
            )}

            {reports.length > 0 && (
                <section style={{ marginTop: 24, display: 'grid', gap: 12 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700 }}>Your reports</h2>
                    {reports.slice().reverse().map(r => {
                        const u = URGENCY[r.urgencyLevel || 'green'] || URGENCY.green;
                        return (
                            <article key={r.id} className="card" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <FileText size={20} color="var(--color-primary)" />
                                    <strong style={{ flex: 1, minWidth: 160 }}>{r.fileName}</strong>
                                    <span className={`status-badge ${u.cls}`}>{u.label}</span>
                                </div>
                                {r.aiSummary && <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 15 }}>{r.aiSummary}</p>}
                                {r.abnormalities?.length > 0 && (
                                    <p style={{ marginTop: 8, fontSize: 14, display: 'flex', gap: 6 }}>
                                        <AlertTriangle size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span><strong>Outside normal range:</strong> {r.abnormalities.join(', ')}</span>
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </section>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
                <button onClick={handleContinue} className="btn-primary" disabled={analyzing}>
                    {reports.length ? 'Continue to consultation' : 'Skip — I have no reports'} <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}
