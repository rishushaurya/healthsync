'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Shield, Brain, Stethoscope, Clock, Users, ChartLine,
  ArrowRight, Upload, Activity, HeartPulse, FileText, Pill
} from 'lucide-react';

const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

const features = [
  {
    Icon: Brain,
    title: '3D Digital Twin',
    desc: 'AI-powered body model that tracks your symptoms and health in real-time.',
    gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
  },
  {
    Icon: FileText,
    title: 'Smart Report Analysis',
    desc: 'Upload any medical report — AI reads, summarizes, and flags abnormalities.',
    gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
  },
  {
    Icon: Activity,
    title: 'Recovery Journey',
    desc: 'AI generates personalized recovery plans with timeline, meds, and diet.',
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
  },
  {
    Icon: Stethoscope,
    title: 'Doctor Matching',
    desc: 'Find and book verified specialists. Doctors get a full patient dashboard.',
    gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
  },
  {
    Icon: Pill,
    title: 'Jan Aushadhi Optimizer',
    desc: 'Find generic alternatives at government prices — save up to 80% on medicines.',
    gradient: 'linear-gradient(135deg, #EF4444, #F87171)',
  },
  {
    Icon: Users,
    title: 'Family Health Tree',
    desc: 'Track health for your entire family — emergency SOS with one tap.',
    gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
  },
];

const howItWorks = [
  { Icon: Upload, title: 'Upload or Describe', desc: 'Upload a report or tell AI about your symptoms and condition.' },
  { Icon: Brain, title: 'AI Analyzes', desc: 'Our AI understands your health context and generates personalized insights.' },
  { Icon: HeartPulse, title: 'Recovery Plan', desc: 'Get a complete plan with timeline, medications, diet, and doctor recommendations.' },
  { Icon: Shield, title: 'Track & Verify', desc: 'Track progress, log vitals, and get your plan verified by real doctors.' },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: '-100px' });

  useEffect(() => setMounted(true), []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        {/* 3D BG */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {mounted && <HeroScene />}
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '0 20px' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 30,
              background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)',
              fontSize: 14, color: 'var(--color-primary)', fontWeight: 500, marginBottom: 28,
            }}>
              <HeartPulse size={16} /> AI-Powered Health Recovery
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, marginTop: 16 }}
          >
            Your Health,{' '}
            <span className="gradient-text">Reimagined</span>{' '}
            with AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}
          >
            Upload medical reports, talk to your AI health companion, track recovery journeys, and connect with verified doctors — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/auth">
              <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                Get Started <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/auth">
              <button className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope size={18} /> Doctor Portal
              </button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div ref={featuresRef} style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={featuresInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            Everything You Need for <span className="gradient-text">Recovery</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
            Built for India — multi-language, ABDM compatible, Jan Aushadhi integrated.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {features.map((feature, i) => {
            const FIcon = feature.Icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: 28, cursor: 'default' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: feature.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <FIcon size={26} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{feature.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 20px 80px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {howItWorks.map((step, i) => {
            const SIcon = step.Icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <SIcon size={26} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--gradient-primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, margin: '0 auto 12px',
                }}>{i + 1}</div>
                <h4 style={{ fontWeight: 700, marginBottom: 6 }}>{step.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        maxWidth: 900, margin: '0 auto 60px', padding: '40px 30px',
        borderRadius: 20, background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'center',
      }}>
        {[
          { value: 'ABDM', label: 'Compatible' },
          { value: '6+', label: 'Languages' },
          { value: '18+', label: 'Specialists' },
          { value: 'Free', label: 'Open Source' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, backgroundImage: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '30px 20px', borderTop: '1px solid var(--border-color)',
        textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <HeartPulse size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>HealthSync</span>
        </div>
        Built for India | DPDP Act 2023 Compliant | ABDM Ready
      </footer>
    </div>
  );
}
