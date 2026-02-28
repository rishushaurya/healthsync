'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Brain, AlertTriangle, CheckCircle, XCircle, Loader2, Plus, ArrowRight, Stethoscope, X, Pill, Share2 } from 'lucide-react';
import { getReports, addReport, generateId, getCurrentUser, getJourneys, addJourney, setJourneys, getAppointments, getDoctorAccounts, shareReportWithDoctor, autoShareReportsWithDoctor, type MedicalReport, type HealthJourney } from '@/lib/store';
import { cloudAddReport, cloudShareReport } from '@/lib/shared-store';
import { formatContextForAI, buildAIContext } from '@/lib/ai-context';
import { useLanguage } from '@/lib/LanguageProvider';
import Link from 'next/link';

interface AnalysisResult {
    laymanSummary: string;
    technicalSummary: string;
    abnormalities: string[];
    recommendations: string[];
    urgencyLevel: string;
    urgencyExplanation?: string;
    suggestedSpecialist?: string;
    estimatedCondition?: string;
    medications?: string[];
    followUpTests?: string[];
    janAushadhiAlternatives?: string[];
    isValidReport?: boolean;
    validationMessage?: string;
}

export default function ReportsPage() {
    const { t } = useLanguage();
    const [reports, setReportsList] = useState<MedicalReport[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [activeReport, setActiveReport] = useState<MedicalReport | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [showCreateJourney, setShowCreateJourney] = useState(false);
    const [creatingJourney, setCreatingJourney] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setReportsList(getReports());
    }, []);

    const extractTextFromFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            const isImage = file.type.startsWith('image/');
            if (isImage) {
                reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    resolve(`[IMAGE_BASE64]${base64.split(',')[1] || base64}[/IMAGE_BASE64]\nFile: ${file.name}\nType: ${file.type}`);
                };
                reader.onerror = () => resolve('Error reading image file');
                reader.readAsDataURL(file);
            } else {
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    resolve(text || 'Unable to read file content');
                };
                reader.onerror = () => resolve('Error reading file');
                reader.readAsText(file);
            }
        });
    };

    const analyzeReport = async (file: File) => {
        setAnalyzing(true);
        setAnalysis(null);

        try {
            const reportText = await extractTextFromFile(file);
            const ctx = buildAIContext();
            const contextStr = formatContextForAI(ctx);

            const res = await fetch('/api/ai/analyze-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportText,
                    fileName: file.name,
                    userContext: contextStr,
                }),
            });

            const data = await res.json();

            if (data.analysis) {
                const analysisData = data.analysis;
                // Check if AI flagged it as invalid
                const isValid = analysisData.isValidReport !== false;
                setAnalysis({ ...analysisData, isValidReport: isValid });

                if (!isValid) {
                    // AI says invalid report — don't save
                    setAnalyzing(false);
                    return;
                }

                // Save report to store
                const report: MedicalReport = {
                    id: generateId(),
                    userId: getCurrentUser()?.id || 'unknown',
                    fileName: file.name,
                    uploadDate: new Date().toISOString(),
                    fileData: reportText.substring(0, 5000),
                    aiSummary: analysisData.laymanSummary || '',
                    technicalSummary: analysisData.technicalSummary || '',
                    abnormalities: analysisData.abnormalities || [],
                    recommendations: analysisData.recommendations || [],
                    urgencyLevel: analysisData.urgencyLevel || 'green',
                    fileType: file.type,
                    sharedWith: [],
                };
                addReport(report);
                // Cloud sync for cross-device (doctor can see)
                cloudAddReport(report).catch(() => { });
                // Auto-share with appointed doctors
                const user = getCurrentUser();
                if (user) {
                    const apts = getAppointments();
                    const doctorIds = [...new Set(apts.map(a => a.doctorId))];
                    doctorIds.forEach(did => {
                        autoShareReportsWithDoctor(user.id, did);
                        cloudShareReport(user.id, report.id, did).catch(() => { });
                    });
                }
                setReportsList(getReports());
                setActiveReport(report);
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setAnalysis({
                laymanSummary: 'Unable to analyze this report. Please try again or upload a different file.',
                technicalSummary: '',
                abnormalities: [],
                recommendations: ['Try uploading a text-based report (.txt, .csv)'],
                urgencyLevel: 'green',
            });
        }
        setAnalyzing(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) analyzeReport(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) analyzeReport(file);
    };

    const createJourneyFromReport = async () => {
        if (!analysis) return;
        setCreatingJourney(true);

        try {
            const condition = analysis.estimatedCondition || analysis.abnormalities?.[0] || 'Health Recovery';
            const user = getCurrentUser();
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `Based on this medical report analysis, create a recovery plan:
                        
Report Summary: ${analysis.laymanSummary}
Abnormalities: ${analysis.abnormalities?.join(', ')}
Recommendations: ${analysis.recommendations?.join(', ')}
Suggested Specialist: ${analysis.suggestedSpecialist || 'General'}
Medications: ${analysis.medications?.join(', ') || 'None mentioned'}

Return ONLY a valid JSON object:
{
  "title": "Recovery plan title",
  "timeline": [{"title": "Step", "description": "What to do", "day": 1, "type": "checkup|medication|diet|exercise|lifestyle"}],
  "medications": [{"name": "Medicine", "dosage": "dose", "time": ["8:00 AM"]}],
  "dietPlan": [{"meal": "Breakfast|Lunch|Snack|Dinner", "items": ["food1"], "calories": 350, "time": "8:00 AM"}]
}

Include 6-10 timeline steps. Focus on Indian dietary preferences. Only valid JSON, no markdown.`
                    }],
                    systemPrompt: 'You are a medical recovery plan generator. Return ONLY valid JSON.',
                    userContext: user ? formatContextForAI(buildAIContext()) : undefined,
                }),
            });

            const data = await res.json();
            let plan;
            try {
                const jsonMatch = data.response?.match(/\{[\s\S]*\}/);
                plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
            } catch { plan = null; }

            if (plan) {
                const journey: HealthJourney = {
                    id: generateId(),
                    userId: getCurrentUser()?.id || 'unknown',
                    title: plan.title || `${condition} Recovery`,
                    condition,
                    status: 'active',
                    triageLevel: (analysis.urgencyLevel as 'red' | 'amber' | 'green') || 'amber',
                    progress: 0,
                    startDate: new Date().toISOString(),
                    timeline: (plan.timeline || []).map((s: { title: string; description: string; day: number; type: string }, i: number) => ({
                        id: generateId(), title: s.title, description: s.description,
                        day: s.day || i + 1, status: 'pending' as const, type: s.type || 'lifestyle',
                    })),
                    medications: (plan.medications || []).map((m: { name: string; dosage: string; time: string[] }) => ({
                        id: generateId(), name: m.name, dosage: m.dosage, frequency: 'daily',
                        time: m.time || ['8:00 AM'], taken: (m.time || ['8:00 AM']).map(() => false),
                    })),
                    dietPlan: (plan.dietPlan || []).map((d: { meal: string; items: string[]; calories: number; time: string }) => ({
                        id: generateId(), meal: d.meal, items: d.items, calories: d.calories, time: d.time,
                    })),
                    doctorNotes: '',
                    aiSummary: analysis.laymanSummary,
                    verified: false,
                };

                const existing = getJourneys().map(j => ({ ...j, status: 'paused' as HealthJourney['status'] }));
                existing.push(journey);
                setJourneys(existing);
                setShowCreateJourney(false);
                alert('Recovery journey created! Go to Recovery tab to view it.');
            }
        } catch {
            alert('Failed to create journey. Please try again.');
        }
        setCreatingJourney(false);
    };

    const viewReport = (report: MedicalReport) => {
        setActiveReport(report);
        setAnalysis({
            laymanSummary: report.aiSummary,
            technicalSummary: report.technicalSummary,
            abnormalities: report.abnormalities,
            recommendations: report.recommendations,
            urgencyLevel: report.urgencyLevel || 'green',
        });
    };

    const urgencyColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
        green: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', text: '#10B981', label: 'Normal' },
        amber: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', label: 'Needs Attention' },
        red: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', label: 'Urgent' },
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('reports.title')}</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Upload reports for AI-powered analysis and personalized insights</p>
            </div>

            {/* Upload Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card-static"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                    padding: 48, textAlign: 'center', marginBottom: 24,
                    border: dragOver ? '2px dashed var(--color-primary)' : '1px solid var(--glass-border)',
                    background: dragOver ? 'rgba(14, 165, 233, 0.06)' : undefined,
                    transition: 'all 0.3s ease', cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" accept=".txt,.csv,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.bmp,.tiff,.dicom" onChange={handleFileUpload} style={{ display: 'none' }} />
                {analyzing ? (
                    <div>
                        <Loader2 size={48} style={{ color: 'var(--color-primary)', animation: 'rotate-slow 1s linear infinite', marginBottom: 16 }} />
                        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Analyzing Report...</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>AI is reading and analyzing your medical report</p>
                    </div>
                ) : (
                    <div>
                        <Upload size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, opacity: 0.7 }} />
                        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Drop your medical report here</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
                            Supports images (JPG, PNG, WEBP), PDFs, text files, CSV, DOCX and more
                        </p>
                        <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Choose File
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Analysis Results */}
            <AnimatePresence>
                {analysis && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 24 }}>
                        {/* Invalid Report Warning */}
                        {analysis.isValidReport === false && (
                            <div style={{
                                padding: '20px 24px', borderRadius: 14, marginBottom: 16,
                                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                                display: 'flex', alignItems: 'center', gap: 14,
                            }}>
                                <XCircle size={28} style={{ color: '#EF4444', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 16, marginBottom: 4 }}>Invalid Report</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                        {analysis.validationMessage || 'This file does not appear to be a legitimate medical report. Please upload an actual medical report (lab results, imaging, prescriptions, etc).'}
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Urgency Banner */}
                        <div style={{
                            padding: '16px 24px', borderRadius: 14, marginBottom: 16,
                            background: urgencyColors[analysis.urgencyLevel]?.bg,
                            border: `1px solid ${urgencyColors[analysis.urgencyLevel]?.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {analysis.urgencyLevel === 'red' ? <XCircle size={22} style={{ color: '#EF4444' }} /> :
                                    analysis.urgencyLevel === 'amber' ? <AlertTriangle size={22} style={{ color: '#F59E0B' }} /> :
                                        <CheckCircle size={22} style={{ color: '#10B981' }} />}
                                <div>
                                    <div style={{ fontWeight: 700, color: urgencyColors[analysis.urgencyLevel]?.text }}>
                                        {urgencyColors[analysis.urgencyLevel]?.label}
                                    </div>
                                    {analysis.urgencyExplanation && (
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{analysis.urgencyExplanation}</div>
                                    )}
                                </div>
                            </div>
                            {analysis.suggestedSpecialist && (
                                <Link href="/doctors" style={{ textDecoration: 'none' }}>
                                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Stethoscope size={14} /> Find {analysis.suggestedSpecialist}
                                    </button>
                                </Link>
                            )}
                        </div>

                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="glass-card-static" style={{ padding: 22 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} style={{ color: 'var(--color-primary)' }} /> Simple Explanation</h3>
                                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{analysis.laymanSummary}</p>
                            </div>
                            <div className="glass-card-static" style={{ padding: 22 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} style={{ color: 'var(--color-primary)' }} /> Technical Summary</h3>
                                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{analysis.technicalSummary}</p>
                            </div>
                        </div>

                        {/* Abnormalities */}
                        {analysis.abnormalities?.length > 0 && (
                            <div className="glass-card-static" style={{ padding: 22, marginBottom: 16 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} style={{ color: '#F59E0B' }} /> Abnormal Findings</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {analysis.abnormalities.map((a, i) => (
                                        <div key={i} style={{
                                            padding: '10px 14px', borderRadius: 10,
                                            background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.12)',
                                            fontSize: 14, color: 'var(--text-secondary)',
                                        }}>• {a}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {analysis.recommendations?.length > 0 && (
                            <div className="glass-card-static" style={{ padding: 22, marginBottom: 16 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={16} style={{ color: '#10B981' }} /> Recommendations</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {analysis.recommendations.map((r, i) => (
                                        <div key={i} style={{
                                            padding: '10px 14px', borderRadius: 10,
                                            background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)',
                                            fontSize: 14, color: 'var(--text-secondary)',
                                        }}>• {r}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Jan Aushadhi Alternatives */}
                        {analysis.janAushadhiAlternatives && analysis.janAushadhiAlternatives.length > 0 && (
                            <div className="glass-card-static" style={{ padding: 22, marginBottom: 16 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Pill size={16} style={{ color: '#0EA5E9' }} /> Generic Medicine Alternatives (Jan Aushadhi)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {analysis.janAushadhiAlternatives.map((a, i) => (
                                        <div key={i} style={{
                                            padding: '10px 14px', borderRadius: 10,
                                            background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.12)',
                                            fontSize: 14, color: 'var(--text-secondary)',
                                        }}>• {a}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action: Create Recovery Journey */}
                        <div className="glass-card-static" style={{
                            padding: 24, textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.06), rgba(139, 92, 246, 0.06))',
                        }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Create Recovery Journey from This Report</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                AI will generate a personalized recovery plan with timeline, medications, and diet.
                            </p>
                            <button
                                className="btn-primary"
                                onClick={() => { setShowCreateJourney(true); createJourneyFromReport(); }}
                                disabled={creatingJourney}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: creatingJourney ? 0.6 : 1 }}
                            >
                                {creatingJourney ? (
                                    <><Loader2 size={16} style={{ animation: 'rotate-slow 1s linear infinite' }} /> Creating Plan...</>
                                ) : (
                                    <><Brain size={16} /> Generate Recovery Plan</>
                                )}
                            </button>
                        </div>

                        {/* Disclaimer */}
                        <div style={{
                            marginTop: 16, padding: '12px 16px', borderRadius: 12,
                            background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.12)',
                            fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
                        }}>
                            AI analysis is for informational purposes only. Always consult a qualified healthcare provider for medical decisions.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Previous Reports */}
            {reports.length > 0 && !analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} style={{ color: 'var(--color-primary)' }} /> Your Reports</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {reports.map((report, i) => (
                            <div key={report.id} className="glass-card" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => viewReport(report)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 10,
                                            background: 'rgba(14, 165, 233, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{report.fileName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(report.uploadDate).toLocaleDateString()} — {report.aiSummary?.substring(0, 60)}...
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {report.urgencyLevel && (
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                                ...urgencyColors[report.urgencyLevel] ? {
                                                    background: urgencyColors[report.urgencyLevel].bg,
                                                    color: urgencyColors[report.urgencyLevel].text,
                                                } : {},
                                            }}>
                                                {report.urgencyLevel?.toUpperCase()}
                                            </span>
                                        )}
                                        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </div>
                                {/* Share with Doctor */}
                                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                                    <Share2 size={13} style={{ color: 'var(--text-muted)' }} />
                                    <select
                                        className="input-field"
                                        style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
                                        defaultValue=""
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            const doctorId = e.target.value;
                                            if (!doctorId) return;
                                            const user = getCurrentUser();
                                            if (user) {
                                                shareReportWithDoctor(user.id, report.id, doctorId);
                                                cloudShareReport(user.id, report.id, doctorId).catch(() => { });
                                                setReportsList(getReports());
                                            }
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">Share with doctor...</option>
                                        {getDoctorAccounts().map(d => (
                                            <option key={d.id} value={d.id} disabled={report.sharedWith?.includes(d.id)}>
                                                {d.name} — {d.specialty} {report.sharedWith?.includes(d.id) ? '(shared)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {(report.sharedWith?.length || 0) > 0 && (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            Shared with {report.sharedWith?.length} doctor{(report.sharedWith?.length || 0) > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {reports.length === 0 && !analysis && !analyzing && (
                <div className="glass-card-static" style={{ padding: 40, textAlign: 'center' }}>
                    <FileText size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, opacity: 0.5 }} />
                    <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No Reports Yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Upload your first medical report to get AI-powered analysis, recommendations, and a personalized recovery plan.
                    </p>
                </div>
            )}
        </div>
    );
}
