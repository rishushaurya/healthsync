'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Pill, Calendar, Download, CheckCircle, Clock } from 'lucide-react';
import { getCurrentUser, type Prescription } from '@/lib/store';
import { cloudGetPatientPrescriptions } from '@/lib/shared-store';
import { useLanguage } from '@/lib/LanguageProvider';

export default function UserPrescriptionsPage() {
    const { t } = useLanguage();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

    useEffect(() => {
        const user = getCurrentUser();
        if (user) cloudGetPatientPrescriptions(user.id).then(setPrescriptions);
    }, []);

    const downloadPrescription = (rx: Prescription) => {
        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prescription - ${rx.diagnosis}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1a1a2e;background:#fff}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0EA5E9;padding-bottom:20px;margin-bottom:24px}
.logo{font-size:24px;font-weight:800;color:#0EA5E9}
.date{font-size:13px;color:#666}
.section{margin-bottom:20px}
.section-title{font-size:14px;font-weight:700;color:#0EA5E9;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:6px}
.diagnosis{font-size:20px;font-weight:700;margin-bottom:4px}
.doctor{font-size:14px;color:#555}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#f0f7ff;padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border:1px solid #ddd}
td{padding:10px 12px;font-size:13px;border:1px solid #ddd}
.advice{background:#f0f7ff;padding:14px;border-radius:8px;border-left:4px solid #0EA5E9;font-size:14px}
.footer{margin-top:30px;padding-top:16px;border-top:2px solid #eee;font-size:11px;color:#888;text-align:center}
.status{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;background:${rx.status === 'active' ? '#e0f2fe' : '#d1fae5'};color:${rx.status === 'active' ? '#0369a1' : '#065f46'}}
@media print{body{padding:20px}@page{margin:1cm}}
</style></head><body>
<div class="header"><div class="logo">HealthSync</div><div class="date">${new Date(rx.date).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}<br><span class="status">${rx.status.toUpperCase()}</span></div></div>
<div class="section"><div class="diagnosis">${rx.diagnosis}</div><div class="doctor">Prescribed by ${rx.doctorName}</div></div>
<div class="section"><div class="section-title">Medicines</div>
<table><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Notes</th></tr>
${rx.medicines.map((m, i) => `<tr><td>${i + 1}</td><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td>${m.notes || '-'}</td></tr>`).join('')}
</table></div>
${rx.advice ? `<div class="section"><div class="section-title">Doctor's Advice</div><div class="advice">${rx.advice}</div></div>` : ''}
${rx.followUpDate ? `<div class="section"><div class="section-title">Follow-up</div><p style="font-size:14px">Scheduled: <strong>${new Date(rx.followUpDate).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p></div>` : ''}
<div class="footer">Generated via HealthSync &mdash; AI-Assisted Recovery Journey System<br>This is for reference only. Always consult your doctor for medical advice.</div>
</body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription_${rx.diagnosis.replace(/\s+/g, '_')}_${new Date(rx.date).toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{t('rx.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>{t('rx.subtitle')}</p>

            {prescriptions.length === 0 ? (
                <div className="glass-card-static" style={{ padding: 60, textAlign: 'center' }}>
                    <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 14, opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{t('rx.noPrescriptions')}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>When your doctor sends a prescription, it will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {prescriptions.slice().reverse().map((rx, i) => (
                        <motion.div key={rx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="glass-card-static" style={{ padding: 22 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                <div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{rx.diagnosis}</h3>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Dr. {rx.doctorName.replace('Dr. ', '')} • {new Date(rx.date).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                        background: rx.status === 'active' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)',
                                        color: rx.status === 'active' ? '#0EA5E9' : '#10B981',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}>
                                        {rx.status === 'active' ? <Clock size={12} /> : <CheckCircle size={12} />} {rx.status}
                                    </span>
                                    <button onClick={() => downloadPrescription(rx)} className="btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Download size={12} /> {t('common.download')}
                                    </button>
                                </div>
                            </div>

                            {/* Medicines */}
                            <div style={{ marginBottom: 14 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>{t('rx.medicines')}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {rx.medicines.map((m, j) => (
                                        <div key={j} style={{
                                            padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Pill size={16} style={{ color: '#8B5CF6' }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.dosage} • {m.frequency} • {m.duration}</div>
                                                </div>
                                            </div>
                                            {m.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{m.notes}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Advice */}
                            {rx.advice && (
                                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.1)', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{t('rx.advice')}:</span>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{rx.advice}</p>
                                </div>
                            )}

                            {/* Follow-up */}
                            {rx.followUpDate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <Calendar size={12} /> {t('rx.followUp')}: {new Date(rx.followUpDate).toLocaleDateString('en', { day: 'numeric', month: 'long' })}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
