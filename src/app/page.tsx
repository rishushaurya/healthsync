'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Stethoscope, Video, FileText, PersonStanding, Pill, Siren, HeartPulse, Users, Leaf,
  ArrowRight, ShieldCheck, Languages, BadgeCheck, Phone, CalendarCheck, ClipboardList,
  Mic, Building2, Droplet, IdCard, LayoutDashboard, Menu, X, CheckCircle2, Activity, Clock,
} from 'lucide-react';

const services = [
  { Icon: Video, title: 'Video & audio consultations', desc: 'Talk to a verified doctor from home. Calls work on mobile data and low bandwidth.' },
  { Icon: IdCard, title: 'ABHA-linked health record', desc: 'Your reports, prescriptions and visits in one record, shared only with your consent.' },
  { Icon: FileText, title: 'Lab report reading', desc: 'Upload a photo or PDF of a report. Values are extracted and explained in plain language.' },
  { Icon: PersonStanding, title: '3D body map', desc: 'Point to where it hurts on a male, female or neutral 3D body so your doctor sees exactly where.' },
  { Icon: Pill, title: 'Generic medicines', desc: 'Compare branded medicines with Jan Aushadhi generics and order with one tap.' },
  { Icon: HeartPulse, title: 'Recovery plans', desc: 'Doctor-approved medication schedules, diet and follow-ups, with daily reminders.' },
  { Icon: Users, title: 'Family health', desc: 'Manage care for parents and children from one account, with an emergency contact tree.' },
  { Icon: Leaf, title: 'AYUSH care', desc: 'Ayurveda consultations and dosha assessment alongside your regular treatment.' },
];

const steps = [
  { Icon: ClipboardList, title: 'Describe your symptoms', desc: 'Answer a short, guided check-in in your own language, by typing or speaking.' },
  { Icon: Activity, title: 'Share vitals and reports', desc: 'Add readings from a kiosk or home device and upload any recent reports.' },
  { Icon: Video, title: 'Consult a doctor', desc: 'Book a slot or join a video call. Your doctor sees your full history first.' },
  { Icon: CalendarCheck, title: 'Follow your care plan', desc: 'Get a signed prescription and a recovery plan you can track day by day.' },
];

const doctorTools = [
  'Patient history, vitals and reports in one case view before every consult',
  'Ambient recorder turns the consultation into structured notes',
  'Draft prescriptions you review, edit and sign — nothing reaches a patient unsigned',
  'Video and audio calls with patients directly from the dashboard',
];

const portals = [
  { Icon: Building2, name: 'Hospital', desc: 'Beds, ICU and ambulance dispatch', href: '/hospital' },
  { Icon: Droplet, name: 'Blood bank', desc: 'Live stock and donor registry', href: '/blood-bank' },
  { Icon: IdCard, name: 'ABHA for patients', desc: 'Create or link your ABHA ID', href: '/abha/patient' },
  { Icon: ShieldCheck, name: 'ABHA registry', desc: 'Government verification view', href: '/abha/gov' },
  { Icon: Leaf, name: 'AYUSH', desc: 'Ayurveda consultations', href: '/ayurveda' },
  { Icon: LayoutDashboard, name: 'Administration', desc: 'System metrics and audit logs', href: '/admin' },
];

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how' },
  { label: 'For doctors', href: '#doctors' },
  { label: 'Portals', href: '#portals' },
];

const css = `
.lp-nav { position: sticky; top: 0; z-index: 40; background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--border-color); }
.lp-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 24px; }
.lp-links { display: flex; gap: 28px; }
.lp-links a { color: var(--text-secondary); text-decoration: none; font-weight: 500; font-size: 15px; }
.lp-links a:hover { color: var(--color-primary); }
.lp-actions { display: flex; gap: 10px; }
.lp-menu-btn { display: none; }
.lp-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center; padding-top: 72px; padding-bottom: 80px; }
.lp-h1 { font-size: clamp(34px, 4.6vw, 54px); font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }
.lp-lead { font-size: 18px; color: var(--text-secondary); margin: 20px 0 32px; max-width: 540px; line-height: 1.65; }
.lp-trust { display: flex; flex-wrap: wrap; gap: 10px 22px; margin-top: 32px; color: var(--text-secondary); font-size: 14px; }
.lp-trust span { display: inline-flex; align-items: center; gap: 6px; }
.lp-section { padding: 88px 0; }
.lp-section-alt { background: var(--bg-card); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.lp-h2 { font-size: clamp(28px, 3.2vw, 38px); font-weight: 800; letter-spacing: -0.02em; margin-top: 10px; }
.lp-sub { color: var(--text-secondary); font-size: 17px; margin-top: 12px; max-width: 620px; }
.lp-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 44px; }
.lp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 44px; }
.lp-icon { width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center; background: var(--primary-soft); color: var(--color-primary); }
.lp-card { padding: 24px; }
.lp-card h3 { font-size: 17px; font-weight: 700; margin: 16px 0 6px; }
.lp-card p { font-size: 14.5px; color: var(--text-secondary); line-height: 1.6; }
.lp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.lp-check { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--border-color); font-size: 15.5px; }
.lp-portal { display: flex; align-items: center; gap: 14px; padding: 18px; text-decoration: none; color: inherit; }
.lp-portal:hover h3 { color: var(--color-primary); }
.lp-emergency { background: var(--color-danger); color: #fff; }
.lp-emergency-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 18px; padding-bottom: 18px; flex-wrap: wrap; }
.lp-footer { padding: 40px 0; font-size: 14px; color: var(--text-muted); }
.preview { position: relative; display: grid; gap: 14px; }
.preview .card { padding: 18px 20px; }
.pv-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pv-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--primary-soft); color: var(--color-primary); display: grid; place-items: center; font-weight: 700; flex-shrink: 0; }
.pv-label { font-size: 12.5px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
.pv-vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.pv-vital { background: var(--bg-primary); border-radius: 8px; padding: 10px 12px; }
.pv-vital b { display: block; font-size: 20px; font-family: var(--font-display); }
.pv-vital span { font-size: 12px; color: var(--text-muted); }
@media (max-width: 960px) {
  .lp-links, .lp-actions .btn-secondary { display: none; }
  .lp-menu-btn { display: inline-flex; }
  .lp-hero, .lp-split { grid-template-columns: 1fr; gap: 40px; padding-top: 40px; }
  .lp-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .lp-grid-3 { grid-template-columns: 1fr 1fr; }
  .lp-section { padding: 64px 0; }
}
@media (max-width: 600px) {
  .lp-grid-4, .lp-grid-3 { grid-template-columns: 1fr; }
  .lp-actions .btn-primary { padding: 10px 14px; font-size: 14px; }
  .pv-vitals { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
`;

function ProductPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="card">
        <div className="pv-row">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="pv-avatar">AS</div>
            <div>
              <div style={{ fontWeight: 700 }}>Dr. Ananya Sharma</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>General Physician · MBBS, MD</div>
            </div>
          </div>
          <span className="status-badge status-completed"><BadgeCheck size={14} /> Verified</span>
        </div>
        <div className="pv-row" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
            <Clock size={16} /> Today, 4:30 PM · Video consult
          </span>
          <span className="btn-primary" style={{ minHeight: 36, padding: '8px 14px', fontSize: 14 }}><Video size={16} /> Join</span>
        </div>
      </div>

      <div className="card">
        <div className="pv-row">
          <span className="pv-label">Today&apos;s vitals</span>
          <span style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600 }}>All in range</span>
        </div>
        <div className="pv-vitals">
          <div className="pv-vital"><b>118/76</b><span>BP mmHg</span></div>
          <div className="pv-vital"><b>72</b><span>Pulse bpm</span></div>
          <div className="pv-vital"><b>98%</b><span>SpO₂</span></div>
        </div>
      </div>

      <div className="card">
        <div className="pv-row">
          <span className="pv-label">Prescription · signed</span>
          <FileText size={18} color="var(--text-muted)" />
        </div>
        {[['Amoxicillin 500 mg', '1-0-1 · 5 days'], ['Paracetamol 650 mg', 'If fever · max 3/day']].map(([m, d]) => (
          <div key={m} className="pv-row" style={{ marginTop: 10, fontSize: 15 }}>
            <span style={{ fontWeight: 600 }}>{m}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <style>{css}</style>

      <a href="#main" className="sr-only focus:not-sr-only" style={{ position: 'absolute', left: 8, top: 8, zIndex: 50 }}>Skip to content</a>

      {/* Navigation */}
      <header className="lp-nav">
        <div className="container lp-nav-inner">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-primary)', display: 'grid', placeItems: 'center' }}>
              <HeartPulse size={20} color="#fff" />
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>HealthSync</span>
          </Link>
          <nav className="lp-links" aria-label="Main">
            {navLinks.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <div className="lp-actions">
            <Link href="/auth?role=doctor" className="btn-secondary"><Stethoscope size={17} /> Doctor login</Link>
            <Link href="/auth" className="btn-primary">Get care <ArrowRight size={17} /></Link>
            <button className="btn-ghost lp-menu-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)} style={{ padding: 10 }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="container" aria-label="Mobile" style={{ display: 'grid', gap: 4, paddingBottom: 16 }}>
            {navLinks.map(l => <a key={l.href} href={l.href} className="sidebar-link" onClick={() => setMenuOpen(false)}>{l.label}</a>)}
            <Link href="/auth?role=doctor" className="sidebar-link"><Stethoscope size={18} /> Doctor login</Link>
          </nav>
        )}
      </header>

      <main id="main">
        {/* Hero */}
        <section className="container lp-hero">
          <div>
            <span className="eyebrow">Connected care for India</span>
            <h1 className="lp-h1" style={{ marginTop: 14 }}>
              Care that follows you from first symptom to full recovery
            </h1>
            <p className="lp-lead">
              Check in with your symptoms, consult a verified doctor by video, keep every report in your ABHA-linked record and follow a care plan your doctor has signed.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/auth" className="btn-primary" style={{ padding: '14px 26px', fontSize: 16 }}>
                Start a consultation <ArrowRight size={18} />
              </Link>
              <Link href="/auth?role=doctor" className="btn-secondary" style={{ padding: '14px 26px', fontSize: 16 }}>
                <Stethoscope size={18} /> I&apos;m a doctor
              </Link>
            </div>
            <div className="lp-trust">
              <span><ShieldCheck size={17} color="var(--color-accent)" /> ABDM / ABHA ready</span>
              <span><BadgeCheck size={17} color="var(--color-accent)" /> Doctor sign-off on every plan</span>
              <span><Languages size={17} color="var(--color-accent)" /> 6 Indian languages</span>
            </div>
          </div>
          <ProductPreview />
        </section>

        {/* Emergency strip */}
        <section className="lp-emergency" aria-label="Emergency">
          <div className="container lp-emergency-inner">
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 16 }}>
              <Siren size={20} /> Medical emergency? Don&apos;t wait for an appointment.
            </span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="tel:108" className="btn-secondary" style={{ color: 'var(--color-danger)', borderColor: '#fff' }}><Phone size={17} /> Call 108</a>
              <Link href="/auth" className="btn-ghost" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.6)' }}>Request ambulance</Link>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="lp-section">
          <div className="container">
            <span className="eyebrow">Services</span>
            <h2 className="lp-h2">Everything your care needs, in one place</h2>
            <p className="lp-sub">Built around the way patients in India actually get treated — at home, at the clinic and at the hospital.</p>
            <div className="lp-grid-4">
              {services.map(({ Icon, title, desc }) => (
                <article key={title} className="card lp-card">
                  <div className="lp-icon"><Icon size={22} /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="lp-section lp-section-alt">
          <div className="container">
            <span className="eyebrow">How it works</span>
            <h2 className="lp-h2">Four steps, one record</h2>
            <p className="lp-sub">Each step adds to the same health record, so you never repeat your story.</p>
            <ol className="lp-grid-4" style={{ listStyle: 'none' }}>
              {steps.map(({ Icon, title, desc }, i) => (
                <li key={title} style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--color-primary)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
                    <Icon size={22} color="var(--text-muted)" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: '16px 0 6px' }}>{title}</h3>
                  <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* For doctors */}
        <section id="doctors" className="lp-section">
          <div className="container lp-split">
            <div>
              <span className="eyebrow">For doctors</span>
              <h2 className="lp-h2">Spend the consult on the patient, not the paperwork</h2>
              <p className="lp-sub">The doctor portal brings intake, vitals, reports and history together before the call starts.</p>
              <div style={{ marginTop: 24 }}>
                {doctorTools.map(t => (
                  <div key={t} className="lp-check"><CheckCircle2 size={20} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} /> {t}</div>
                ))}
              </div>
              <Link href="/auth?role=doctor" className="btn-primary" style={{ marginTop: 28 }}>
                Open doctor portal <ArrowRight size={17} />
              </Link>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <div className="pv-row">
                <span className="pv-label">Case review · Ravi Kumar, 46 M</span>
                <span className="status-badge status-pending">Awaiting sign-off</span>
              </div>
              <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                {[
                  ['Chief complaint', 'Chest tightness on exertion, 3 days'],
                  ['Vitals', 'BP 148/94 · Pulse 88 · SpO₂ 97%'],
                  ['Reports', 'Lipid profile: LDL 168 mg/dL (high)'],
                  ['Draft plan', 'Atorvastatin 20 mg, ECG within 48 h, follow-up in 1 week'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, fontSize: 15, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <span className="btn-primary" style={{ minHeight: 40, padding: '8px 16px', fontSize: 14 }}><BadgeCheck size={16} /> Approve &amp; sign</span>
                <span className="btn-secondary" style={{ minHeight: 40, padding: '8px 16px', fontSize: 14 }}><Mic size={16} /> Start recorder</span>
              </div>
            </div>
          </div>
        </section>

        {/* Portals */}
        <section id="portals" className="lp-section lp-section-alt">
          <div className="container">
            <span className="eyebrow">Connected portals</span>
            <h2 className="lp-h2">One network for hospitals, blood banks and ABHA</h2>
            <p className="lp-sub">Every portal reads from the same shared record, so an emergency request or a new prescription shows up everywhere it should.</p>
            <div className="lp-grid-3">
              {portals.map(({ Icon, name, desc, href }) => (
                <Link key={href} href={href} className="card glass-card lp-portal">
                  <div className="lp-icon"><Icon size={22} /></div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{name}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{desc}</p>
                  </div>
                  <ArrowRight size={18} color="var(--text-muted)" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 700 }}>
            <HeartPulse size={18} color="var(--color-primary)" /> HealthSync
          </span>
          <span>ABDM ready · DPDP Act 2023 aligned · Not a substitute for emergency care — call 108</span>
        </div>
      </footer>
    </div>
  );
}
