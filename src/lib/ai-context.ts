'use client';

// AI Context Builder — creates unified user context for all AI interactions

import {
  getCurrentUser,
  getVitals,
  getReports,
  getJourneys,
  getFamilyMembers,
  getAppointments,
  getPatientPrescriptions,
  type UserProfile,
  type Vital,
  type MedicalReport,
  type HealthJourney,
  type Prescription,
} from './store';

export interface AIUserContext {
  profile: UserProfile | null;
  vitals: Vital[];
  reports: { fileName: string; aiSummary: string; urgencyLevel?: string; uploadDate: string }[];
  activeJourney: HealthJourney | null;
  prescriptions: { doctorName: string; diagnosis: string; medicines: string[]; advice: string; date: string }[];
  familySize: number;
  healthScore: number;
  recentSymptoms: string[];
  upcomingAppointments: { doctorName: string; date: string; specialty: string }[];
}

/**
 * Calculate health score from actual vitals data (0-100)
 */
export function calculateHealthScore(vitals: Vital[]): number {
  if (vitals.length === 0) return 50; // default for new users

  let score = 70; // base score
  const weights = { bp: 20, sugar: 15, heartRate: 15, spo2: 20, temperature: 10, weight: 5 };
  const checked: Record<string, boolean> = {};

  // Get latest of each type
  const latest: Record<string, Vital> = {};
  for (const v of vitals) {
    latest[v.type] = v;
  }

  // Blood Pressure
  if (latest.bp) {
    checked.bp = true;
    const parts = latest.bp.value.split('/');
    const sys = parseFloat(parts[0]);
    const dia = parseFloat(parts[1]) || 80;
    if (sys >= 90 && sys <= 130 && dia >= 60 && dia <= 85) score += weights.bp;
    else if (sys > 140 || dia > 90) score -= 10;
    else score += weights.bp * 0.5;
  }

  // Blood Sugar (fasting)
  if (latest.sugar) {
    checked.sugar = true;
    const v = parseFloat(latest.sugar.value);
    if (v >= 70 && v <= 110) score += weights.sugar;
    else if (v > 126 || v < 60) score -= 10;
    else score += weights.sugar * 0.5;
  }

  // Heart Rate
  if (latest.heartRate) {
    checked.heartRate = true;
    const v = parseFloat(latest.heartRate.value);
    if (v >= 60 && v <= 100) score += weights.heartRate;
    else if (v > 120 || v < 50) score -= 10;
    else score += weights.heartRate * 0.5;
  }

  // SpO2
  if (latest.spo2) {
    checked.spo2 = true;
    const v = parseFloat(latest.spo2.value);
    if (v >= 96) score += weights.spo2;
    else if (v < 92) score -= 15;
    else score += weights.spo2 * 0.5;
  }

  // Temperature
  if (latest.temperature) {
    checked.temperature = true;
    const v = parseFloat(latest.temperature.value);
    if (v >= 97 && v <= 99.5) score += weights.temperature;
    else if (v > 101) score -= 10;
    else score += weights.temperature * 0.5;
  }

  // Bonus for tracking consistency
  const typesTracked = Object.keys(checked).length;
  if (typesTracked >= 3) score += 5;
  if (typesTracked >= 5) score += 5;

  return Math.max(10, Math.min(100, Math.round(score)));
}

/**
 * Build full user context for AI calls
 */
export function buildAIContext(): AIUserContext {
  const profile = getCurrentUser();
  const vitals = getVitals();
  const reports = getReports();
  const journeys = getJourneys();
  const family = getFamilyMembers();
  const appointments = getAppointments();
  const prescriptions = profile ? getPatientPrescriptions(profile.id) : [];

  const activeJourney = journeys.find(j => j.status === 'active') || null;

  return {
    profile,
    vitals: vitals.slice(-20),
    reports: reports.map(r => ({
      fileName: r.fileName,
      aiSummary: r.aiSummary?.substring(0, 300) || '',
      urgencyLevel: r.urgencyLevel,
      uploadDate: r.uploadDate,
    })),
    activeJourney,
    prescriptions: prescriptions.filter(p => p.status === 'active').map(p => ({
      doctorName: p.doctorName,
      diagnosis: p.diagnosis,
      medicines: p.medicines.map(m => `${m.name} ${m.dosage} ${m.frequency}`),
      advice: p.advice || '',
      date: p.date,
    })),
    familySize: family.length,
    healthScore: calculateHealthScore(vitals),
    recentSymptoms: [],
    upcomingAppointments: appointments
      .filter(a => a.status === 'booked' && new Date(a.date) >= new Date())
      .slice(0, 3)
      .map(a => ({ doctorName: a.doctorName, date: a.date, specialty: a.specialty })),
  };
}

/**
 * Format context for AI system prompt injection
 */
export function formatContextForAI(ctx: AIUserContext): string {
  let text = '';

  if (ctx.profile) {
    text += `\n--- PATIENT PROFILE ---\n`;
    text += `Name: ${ctx.profile.name}\n`;
    text += `Age: ${ctx.profile.age || 'Unknown'} | Gender: ${ctx.profile.gender || 'Unknown'}\n`;
    text += `Activity: ${ctx.profile.activityLevel || 'Unknown'}\n`;
    text += `Intent: ${ctx.profile.intent || 'general'}\n`;
    if (ctx.profile.existingConditions?.length) {
      text += `Conditions: ${ctx.profile.existingConditions.join(', ')}\n`;
    }
    if (ctx.profile.healthGoals?.length) {
      text += `Goals: ${ctx.profile.healthGoals.join(', ')}\n`;
    }
  }

  text += `\nHealth Score: ${ctx.healthScore}/100\n`;

  if (ctx.vitals.length > 0) {
    const recentVitals = ctx.vitals.slice(-10);
    text += `\nRecent Vitals:\n${recentVitals.map(v => `- ${v.type}: ${v.value} ${v.unit} (${v.date})`).join('\n')}\n`;
  }

  if (ctx.reports.length > 0) {
    text += `\nMedical Reports:\n${ctx.reports.map(r => `- ${r.fileName} [${r.urgencyLevel || 'N/A'}]: ${r.aiSummary.substring(0, 150)}`).join('\n')}\n`;
  }

  if (ctx.activeJourney) {
    text += `\nActive Recovery: "${ctx.activeJourney.title}" — ${ctx.activeJourney.progress}% complete\n`;
    text += `Condition: ${ctx.activeJourney.condition}\n`;
    if (ctx.activeJourney.medications?.length) {
      text += `Medications: ${ctx.activeJourney.medications.map(m => `${m.name} ${m.dosage}`).join(', ')}\n`;
    }
  }

  if (ctx.upcomingAppointments.length > 0) {
    text += `\nUpcoming Appointments:\n${ctx.upcomingAppointments.map(a => `- ${a.doctorName} (${a.specialty}) on ${a.date}`).join('\n')}\n`;
  }

  if (ctx.prescriptions && ctx.prescriptions.length > 0) {
    text += `\nActive Prescriptions:\n${ctx.prescriptions.map(p => `- Dr. ${p.doctorName} (${p.date}): ${p.diagnosis}\n  Medicines: ${p.medicines.join(', ')}${p.advice ? '\n  Advice: ' + p.advice : ''}`).join('\n')}\n`;
  }

  text += `--- END CONTEXT ---\n\nUse this context to provide personalized, relevant health guidance. Reference the patient's specific data when appropriate. When prescriptions are available, factor the prescribed medicines and doctor's advice into your recommendations.`;

  return text;
}
