// Care pipeline actions shared by the doctor's call page and recorder:
// consented transcript → AI draft → doctor approval → patient portal, prescription and cart.
import {
    getPatientData, getConsent, getTranscript, saveCarePlan, saveJourney,
    addPrescription, addNotification, getCart, setCart, generateId, JourneyStep,
    type JourneyWithPatient, type DoctorAccount, type CarePlanDraft, type ConsultationSession, type Vital, type MedicalReport,
} from './store';
import { MEDICINE_CATALOG } from './data';

// Everything gathered before the consultation, as text for the AI draft and the doctor's case view
export function clinicalContext(j: JourneyWithPatient, doctorId: string): string {
    const data = getPatientData(j.patient.id, doctorId);
    const intake = data?.intakeSummaries.at(-1);
    const vitals = (data?.vitals as Vital[] | undefined)?.slice(-6).map(v => `${v.type} ${v.value} ${v.unit} (${v.date})`).join('; ');
    const reports = (data?.reports as MedicalReport[] | undefined)?.map(r => `${r.fileName}: ${r.aiSummary}${r.abnormalities?.length ? ` — abnormal: ${r.abnormalities.join(', ')}` : ''}`).join('\n');
    const answers = j.intakeAnswers ? Object.entries(j.intakeAnswers).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
    return [
        `Reason for visit: ${j.reasonForVisit || 'not given'} (${j.pathway || 'Allopathic'} pathway)`,
        answers && `History intake: ${answers}`,
        intake && `Assessment: ${intake.chiefComplaint}. ${intake.hpi}${intake.redFlags?.length ? ` Red flags: ${intake.redFlags.join(', ')}` : ''}`,
        j.physicianSummary && `Patient-reported summary: ${j.physicianSummary}`,
        vitals && `Recent vitals: ${vitals}`,
        reports && `Shared reports:\n${reports}`,
    ].filter(Boolean).join('\n');
}

export const transcriptText = (journeyId: string) =>
    getTranscript(journeyId).map(l => `${{ doctor: 'Doctor', patient: 'Patient', room: 'Room' }[l.speaker]}: ${l.text}`).join('\n');

// Called when the consultation ends (online call or physical recording). Saves an unapproved draft.
export async function createCarePlanDraft(j: JourneyWithPatient, doctor: DoctorAccount, mode: 'online' | 'physical', startedAt: string, notes = ''): Promise<CarePlanDraft> {
    const consent = getConsent(j.id);
    const transcript = consent.patient && consent.doctor ? transcriptText(j.id) : '';
    const minutes = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));

    const res = await fetch('/api/ai/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            doctorName: doctor.name, doctorSpecialty: doctor.specialty,
            patientName: j.patient.name, patientAge: j.patient.age, patientGender: j.patient.gender,
            patientConditions: j.patient.existingConditions, language: j.patient.language,
            callDuration: minutes, transcript, consultationNotes: notes, clinicalContext: clinicalContext(j, doctor.id),
        }),
    });
    const { prescription: rx, error } = await res.json();
    if (!rx) throw new Error(error || 'Could not draft the care plan');

    const consultation: ConsultationSession = {
        id: generateId(), journeyId: j.id, doctorId: doctor.id, patientId: j.patient.id, type: mode,
        patientConsent: consent.patient, doctorConsent: consent.doctor, transcript, notes,
        recordingAvailable: !!transcript, startedAt, endedAt: new Date().toISOString(),
    };
    const draft: CarePlanDraft = {
        id: generateId(), journeyId: j.id, aiAnalysisId: consultation.id, patientId: j.patient.id, doctorId: doctor.id,
        summary: rx.summary || '', diagnosis: rx.diagnosis || '', medicines: rx.medicines || [],
        dietGuidance: rx.diet || '', lifestyleGuidance: rx.exercise || '', generalInstructions: rx.advice || '',
        followUpDays: Number(rx.followUpDays) || 7, status: 'draft', timestamp: new Date().toISOString(),
    };
    saveCarePlan(j.patient.id, draft);

    const { patient, ...journey } = j;
    saveJourney({
        ...journey, consultationId: consultation.id, aiAnalysisId: consultation.id, draftCarePlanId: draft.id,
        aiSummary: draft.summary, currentStep: JourneyStep.DOCTOR_APPROVAL, updatedAt: new Date().toISOString(),
    });
    addNotification({
        id: generateId(), userId: patient.id, type: 'system', title: 'Consultation complete',
        message: `${doctor.name} is reviewing your care plan. You'll be notified once it's approved.`,
        timestamp: new Date().toISOString(), read: false, link: '/journey/care-plan',
    });
    return draft;
}

// Doctor signs the (edited) draft: only now does the patient see it, get a prescription and a filled cart.
export function approveCarePlan(j: JourneyWithPatient, doctor: DoctorAccount, edited: CarePlanDraft) {
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + edited.followUpDays);
    const followUpDate = followUp.toISOString().split('T')[0];
    const approved: CarePlanDraft = { ...edited, status: 'approved', approvedAt: new Date().toISOString(), followUpDate };
    saveCarePlan(j.patient.id, approved);

    const { patient, ...journey } = j;
    saveJourney({
        ...journey, approvedCarePlanId: approved.id, verified: true, medications: approved.medicines,
        currentStep: JourneyStep.PATIENT_PORTAL, updatedAt: new Date().toISOString(),
    });

    addPrescription({
        id: generateId(), recipientUserId: patient.id, doctorId: doctor.id, doctorName: doctor.name,
        date: approved.approvedAt!, diagnosis: approved.diagnosis || j.reasonForVisit || 'Consultation',
        medicines: approved.medicines,
        advice: [approved.dietGuidance && `Diet: ${approved.dietGuidance}`, approved.lifestyleGuidance && `Exercise: ${approved.lifestyleGuidance}`, approved.generalInstructions].filter(Boolean).join('\n\n'),
        followUpDate, status: 'active',
    });

    // Prescribed medicines go straight into the patient's cart, priced at Jan Aushadhi rates where we stock them
    const cart = getCart(patient.id);
    for (const med of approved.medicines) {
        const match = MEDICINE_CATALOG.find(m => med.name.toLowerCase().includes(m.name.toLowerCase()) || med.name.toLowerCase().includes(m.generic.toLowerCase()));
        if (!cart.some(c => c.name === med.name)) cart.push({ name: med.name, quantity: 1, price: match?.janAushadhi ?? 0 });
    }
    setCart(patient.id, cart);

    addNotification({
        id: generateId(), userId: patient.id, type: 'prescription', title: 'Your care plan is ready',
        message: `${doctor.name} approved your care plan. Your medicines have been added to your cart.`,
        timestamp: new Date().toISOString(), read: false, link: '/journey/patient-portal',
    });
}
