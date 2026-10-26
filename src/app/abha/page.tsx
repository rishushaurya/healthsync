'use client';

import { useRouter } from 'next/navigation';
import { CreditCard, Database, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AbhaHubPage() {
    const router = useRouter();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-default)', padding: '60px 24px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 24,
                        background: 'rgba(5, 150, 105, 0.1)',
                        color: '#059669',
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 20
                    }}>
                        <ShieldCheck size={18} />
                        National Digital Health Mission (NDHM)
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
                        Ayushman Bharat Health Account (ABHA)
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 640, margin: '0 auto 48px' }}>
                        Your unique 14-digit digital health ID. Access interoperable longitudinal electronic health records across India.
                    </p>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, textAlign: 'left' }}>
                    <motion.div
                        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
                        onClick={() => router.push('/abha/patient')}
                        className="glass-card"
                        style={{ padding: 36, cursor: 'pointer', borderRadius: 20, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                        <div>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: 16,
                                background: 'rgba(5, 150, 105, 0.12)',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24
                            }}>
                                <CreditCard size={28} />
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Patient Self-Service</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                                Look up your 14-digit ABHA card, verify demographic details, download digital ID, and view linked healthcare records.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontWeight: 600, fontSize: 15 }}>
                            Access Patient ABHA <ArrowRight size={18} />
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
                        onClick={() => router.push('/abha/gov')}
                        className="glass-card"
                        style={{ padding: 36, cursor: 'pointer', borderRadius: 20, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                        <div>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: 16,
                                background: 'rgba(14, 116, 144, 0.12)',
                                color: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24
                            }}>
                                <Database size={28} />
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>NHA Authority Registry</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                                National Health Authority administration portal. Inspect registered citizen ABHA profiles, clinical consent, and health linkages.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 600, fontSize: 15 }}>
                            Access Government Registry <ArrowRight size={18} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
