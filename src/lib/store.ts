'use client';

// HealthSync Local Storage Store — per-user isolated data

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    password: string; // simple hash
    age: string;
    gender: string;
    activityLevel: string;
    existingConditions: string[];
    healthGoals: string[];
    language: string;
    theme: string;
    location?: string;
    intent: 'diagnosed' | 'undiagnosed' | 'wellness' | '';
    onboardingComplete: boolean;
    createdAt: string;
    avatar?: string;
}

export interface DoctorAccount {
    id: string;
    name: string;
    email: string;
    password: string;
    specialty: string;
    hospital: string;
    experience: string;
    image: string;
}

export interface Appointment {
    id: string;
    userId: string;
    doctorId: string;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
    status: 'booked' | 'completed' | 'cancelled';
    location: string;
    notes: string;
}

export interface HealthJourney {
    id: string;
    userId: string;
    title: string;
    condition: string;
    status: 'active' | 'completed' | 'paused';
    triageLevel: 'red' | 'amber' | 'green';
    progress: number;
    startDate: string;
    endDate?: string;
    timeline: TimelineStep[];
    medications: Medication[];
    dietPlan: DietItem[];
    doctorNotes: string;
    aiSummary: string;
    verified: boolean;
}

export interface ClinicalIntakeSummary {
    id: string;
    userId: string;
    patientName?: string; // Newly added for ABHA
    abhaId?: string; // Newly added for ABHA
    date: string;
    consultationType: 'Allopathic' | 'AYUSH';
    chiefComplaint: string;
    hpi: string;
    pastMedicalHistory: string;
    drugAllergyHistory: string;
    reviewOfSystems: string;
    prakriti?: string;
    vikriti?: string;
    agni?: string;
    aharaVihara?: string;
    familyHistory?: string;
    redFlags: string[];
    transcript?: string;
    explanation?: string;
    recommendedSpecialty?: string;
    specialtyReason?: string;
}


export interface TimelineStep {
    id: string;
    title: string;
    description: string;
    day: number;
    status: 'pending' | 'active' | 'completed';
    type: 'medication' | 'lifestyle' | 'checkup' | 'exercise' | 'diet';
}

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    time: string[];
    taken: boolean[];
    genericAlternative?: string;
    genericPrice?: string;
    brandPrice?: string;
}

export interface DietItem {
    id: string;
    meal: string;
    items: string[];
    calories: number;
    time: string;
}

export interface Vital {
    id: string;
    userId: string;
    type: 'bp' | 'sugar' | 'temperature' | 'weight' | 'heartRate' | 'spo2';
    value: string;
    unit: string;
    date: string;
    time: string;
}

export interface FamilyMember {
    id: string;
    userId: string;
    name: string;
    relation: string;
    age: string;
    conditions: string[];
    emergencyContact: string;
}

export interface MedicalReport {
    id: string;
    userId: string;
    fileName: string;
    uploadDate: string;
    fileData?: string; // base64 or text content
    aiSummary: string;
    technicalSummary: string;
    abnormalities: string[];
    recommendations: string[];
    urgencyLevel?: string;
    journeyId?: string;
    sharedWith?: string[]; // doctor IDs this report is shared with
    fileType?: string; // mime type
    category?: string; // 'prescriptions' | 'laboratory' | 'discharge' | 'imaging' | 'other'
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    type?: 'text' | 'options' | 'report';
    options?: string[];
}

export interface Prescription {
    id: string;
    recipientUserId: string;
    doctorId: string;
    doctorName: string;
    date: string;
    diagnosis: string;
    medicines: { name: string; dosage: string; frequency: string; duration: string; notes: string }[];
    advice: string;
    followUpDate?: string;
    status: 'active' | 'completed';
}

export interface CallLog {
    id: string;
    doctorId: string;
    doctorName: string;
    userId: string;
    userName: string;
    type: 'audio' | 'video';
    status: 'missed' | 'completed' | 'ongoing' | 'ringing';
    startTime: string;
    endTime?: string;
    duration?: number;
}

export interface DoctorNote {
    id: string;
    doctorId: string;
    patientId: string;
    patientName: string;
    date: string;
    content: string;
    type: 'consultation' | 'follow-up' | 'general';
}

export interface Notification {
    id: string;
    userId: string;
    type: 'order' | 'prescription' | 'appointment' | 'call' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
    metadata?: Record<string, string>;
}

export interface MedicineOrder {
    id: string;
    userId: string;
    transactionId: string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    status: 'confirmed' | 'processing' | 'shipped' | 'delivered';
    orderDate: string;
    estimatedDelivery: string;
    deliveryAddress: string;
}


// ---------- New Single Source of Truth Models ----------

export enum JourneyStep {
    PORTAL = 'PORTAL',
    INTAKE = 'INTAKE',
    MEDIKIOSK = 'MEDIKIOSK',
    DIGITAL_TWIN = 'DIGITAL_TWIN',
    REPORTS = 'REPORTS',
    TIMELINE = 'TIMELINE',
    BOOKING = 'BOOKING',
    CONSULTATION = 'CONSULTATION',
    AI_ANALYSIS = 'AI_ANALYSIS',
    DRAFT_PLAN = 'DRAFT_PLAN',
    DOCTOR_APPROVAL = 'DOCTOR_APPROVAL',
    PATIENT_PORTAL = 'PATIENT_PORTAL',
    RECOVERY = 'RECOVERY',
    COMPLETED = 'COMPLETED',
    EMERGENCY = 'EMERGENCY'
}

export interface PatientJourney {
    id: string;
    userId: string;
    currentStep: JourneyStep;
    pathway?: 'Allopathic' | 'AYUSH' | 'Chronic Care' | 'Mental Health' | string;
    reasonForVisit?: string;
    intakeAnswers?: Record<string, any>;
    symptoms?: any[];
    redFlagDetected?: boolean;
    reports?: string[]; // IDs of MedicalReports
    timeline?: any[];
    aiSummary?: string;
    medications?: any[];
    kioskData?: { bp?: string; temp?: string; hr?: string; [key: string]: any };
    physicianSummary?: string;
    appointmentId?: string;
    consultationId?: string;
    aiAnalysisId?: string;
    draftCarePlanId?: string;
    approvedCarePlanId?: string;
    verified?: boolean;
    doctorId?: string;
    consultationMode?: 'Online' | 'Physical';
    recommendedSpecialty?: string; // from MediKiosk / Digital Twin assessment
    createdAt: string;
    updatedAt: string;
}

export interface ConsultationSession {
    id: string;
    journeyId: string;
    doctorId: string;
    patientId: string;
    type: 'online' | 'physical';
    patientConsent: boolean;
    doctorConsent: boolean;
    transcript?: string;
    notes?: string;
    recordingAvailable: boolean;
    startedAt: string;
    endedAt?: string;
}

export interface AIAnalysisRecord {
    id: string;
    journeyId: string;
    consultationId: string;
    extractedSymptoms: string[];
    extractedMedicines: string[];
    extractedAdvice: string[];
    observations: string;
    source: string;
    timestamp: string;
}

export interface CarePlanDraft {
    id: string;
    journeyId: string;
    aiAnalysisId: string;
    medicines: { name: string; dosage: string; frequency: string; duration: string; notes: string }[];
    dietGuidance: string;
    lifestyleGuidance: string;
    followUpDays: number;
    generalInstructions: string;
    status: 'draft' | 'approved' | 'rejected';
    doctorNotes?: string;
    patientId?: string;
    doctorId?: string;
    summary?: string;
    diagnosis?: string;
    approvedAt?: string;
    followUpDate?: string;
    timestamp: string;
}

export interface CarePlanApproved {
    id: string;
    draftId: string;
    journeyId: string;
    doctorId: string;
    medicines: { name: string; dosage: string; frequency: string; duration: string; notes: string }[];
    dietGuidance: string;
    lifestyleGuidance: string;
    followUpDate: string;
    generalInstructions: string;
    timestamp: string;
}

export interface AuditLogEntry {
    id: string;
    actorId: string;
    actorRole: 'patient' | 'doctor' | 'system';
    action: string;
    targetEntity: string;
    targetId: string;
    metadata?: Record<string, any>;
    timestamp: string;
}

// ---------- Simple hash ----------
export function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
}

// ---------- Storage helpers ----------
const getStorage = (key: string) => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

// ---------- Cross-device sync ----------
// App keys are mirrored to /api/store (Redis, or server memory locally) so the doctor's and
// patient's devices see the same records. Session and preference keys stay on this device.
const DEVICE_ONLY = new Set(['healthsync_current_user', 'hs_current_doctor', 'healthsync_doctor_theme']);
const isSynced = (key: string) => (key.startsWith('hs_') || key.startsWith('healthsync_')) && !DEVICE_ONLY.has(key);
const recentWrites = new Map<string, number>();

const pushToCloud = (key: string, value: unknown) =>
    fetch('/api/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) }).catch(() => { });

const setStorage = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
    if (!isSynced(key)) return;
    recentWrites.set(key, Date.now());
    pushToCloud(key, value);
};

// seniordev: last-write-wins per key — two devices editing the same list inside one poll can drop an entry;
// move hot lists to server-side push (shared-store cloudPush) if that shows up.
export async function syncFromCloud(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const res = await fetch('/api/store?all=1', { cache: 'no-store' });
        const cloud: Record<string, unknown> = (await res.json()).data || {};
        for (const [key, value] of Object.entries(cloud)) {
            // Skip keys this device just wrote so a slower in-flight pull can't revert them
            if (value === null || !isSynced(key) || Date.now() - (recentWrites.get(key) || 0) < 5000) continue;
            localStorage.setItem(key, JSON.stringify(value));
        }
        // Seed the server with anything only this device has (first sync, or server memory restarted)
        for (const key of Object.keys(localStorage)) {
            if (isSynced(key) && !(key in cloud)) pushToCloud(key, JSON.parse(localStorage.getItem(key)!));
        }
    } catch { /* offline: keep working from local data */ }
}

// ---------- User registry ----------
export const getAllUsers = (): UserProfile[] => getStorage('healthsync_users') || [];

const saveAllUsers = (users: UserProfile[]) => setStorage('healthsync_users', users);

export function registerUser(user: UserProfile): { success: boolean; error?: string } {
    const users = getAllUsers();
    if (users.find(u => u.email.toLowerCase() === user.email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists' };
    }
    users.push(user);
    saveAllUsers(users);
    return { success: true };
}

export function loginUser(email: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
    const users = getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, error: 'No account found with this email' };
    if (user.password !== simpleHash(password)) return { success: false, error: 'Incorrect password' };
    return { success: true, user };
}

// ---------- Current user ----------
export const getCurrentUser = (): UserProfile | null => getStorage('healthsync_current_user');
export const setCurrentUser = (user: UserProfile) => {
    setStorage('healthsync_current_user', user);
    // Also update in registry
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) { users[idx] = user; saveAllUsers(users); }
};
export const clearCurrentUser = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('healthsync_current_user');
};

// ---------- Per-user key helper ----------
function userKey(base: string): string {
    const user = getCurrentUser();
    return user ? `${base}_${user.id}` : base;
}

// ---------- Journeys ----------
export const getJourneys = (): HealthJourney[] => getStorage(userKey('hs_journeys')) || [];
export const setJourneys = (journeys: HealthJourney[]) => setStorage(userKey('hs_journeys'), journeys);
export const addJourney = (journey: HealthJourney) => {
    const journeys = getJourneys();
    journeys.push(journey);
    setJourneys(journeys);
};
export const updateJourney = (id: string, updates: Partial<HealthJourney>) => {
    const journeys = getJourneys().map(j => j.id === id ? { ...j, ...updates } : j);
    setJourneys(journeys);
};

// ---------- Vitals ----------
export const getVitals = (): Vital[] => getStorage(userKey('hs_vitals')) || [];
export const addVital = (vital: Vital) => {
    const vitals = getVitals();
    vitals.push(vital);
    setStorage(userKey('hs_vitals'), vitals);
};

// ---------- Family ----------
export const getFamilyMembers = (): FamilyMember[] => getStorage(userKey('hs_family')) || [];
export const addFamilyMember = (member: FamilyMember) => {
    const members = getFamilyMembers();
    members.push(member);
    setStorage(userKey('hs_family'), members);
};

// ---------- Reports ----------
export const getReports = (): MedicalReport[] => getStorage(userKey('hs_reports')) || [];
export const addReport = (report: MedicalReport) => {
    const reports = getReports();
    reports.push(report);
    setStorage(userKey('hs_reports'), reports);
};

// ---------- Chat History (general AI) ----------
export const getChatHistory = (): ChatMessage[] => getStorage(userKey('hs_chat')) || [];
export const setChatHistory = (messages: ChatMessage[]) => setStorage(userKey('hs_chat'), messages);
export const addChatMessage = (message: ChatMessage) => {
    const messages = getChatHistory();
    messages.push(message);
    setChatHistory(messages);
};

// ---------- Digital Twin Chat ----------
export const getDigitalTwinChat = (): ChatMessage[] => getStorage(userKey('hs_dt_chat')) || [];
export const setDigitalTwinChat = (messages: ChatMessage[]) => setStorage(userKey('hs_dt_chat'), messages);

// ---------- Appointments ----------
export const getAppointments = (): Appointment[] => getStorage(userKey('hs_appointments')) || [];

export const getAllAppointments = (): (Appointment & { patientName: string; patientEmail: string })[] => {
    const users = getAllUsers();
    let allApts: (Appointment & { patientName: string; patientEmail: string })[] = [];
    for (const u of users) {
        const apts: Appointment[] = getStorage(`hs_appointments_${u.id}`) || [];
        allApts = allApts.concat(apts.map(a => ({ ...a, patientName: u.name, patientEmail: u.email })));
    }
    return allApts.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
};

export const addAppointment = (apt: Appointment) => {
    const apts = getAppointments();
    apts.push(apt);
    setStorage(userKey('hs_appointments'), apts);
};

// ---------- Doctor accounts ----------
const DOCTOR_ACCOUNTS: DoctorAccount[] = [
    { id: 'doc1', name: 'Dr. Priya Sharma', email: 'priya@healthsync.com', password: simpleHash('doctor123'), specialty: 'Nephrologist', hospital: 'AIIMS Delhi', experience: '15 yrs', image: 'PS' },
    { id: 'doc2', name: 'Dr. Rajesh Kumar', email: 'rajesh@healthsync.com', password: simpleHash('doctor123'), specialty: 'Cardiologist', hospital: 'Max Hospital', experience: '20 yrs', image: 'RK' },
    { id: 'doc3', name: 'Dr. Ananya Patel', email: 'ananya@healthsync.com', password: simpleHash('doctor123'), specialty: 'General Physician', hospital: 'Apollo Clinic', experience: '12 yrs', image: 'AP' },
    { id: 'doc4', name: 'Dr. Suresh Reddy', email: 'suresh@healthsync.com', password: simpleHash('doctor123'), specialty: 'Orthopedic', hospital: 'Fortis Hospital', experience: '18 yrs', image: 'SR' },
    { id: 'doc5', name: 'Dr. Meera Iyer', email: 'meera@healthsync.com', password: simpleHash('doctor123'), specialty: 'Dermatologist', hospital: 'Manipal Hospital', experience: '10 yrs', image: 'MI' },
    { id: 'doc6', name: 'Dr. Vikram Singh', email: 'vikram@healthsync.com', password: simpleHash('doctor123'), specialty: 'Neurologist', hospital: 'Medanta Hospital', experience: '22 yrs', image: 'VS' },
    { id: 'doc7', name: 'Dr. Kavita Desai', email: 'kavita@healthsync.com', password: simpleHash('doctor123'), specialty: 'Gynecologist', hospital: 'Kokilaben Hospital', experience: '16 yrs', image: 'KD' },
    { id: 'doc8', name: 'Dr. Arjun Nair', email: 'arjun@healthsync.com', password: simpleHash('doctor123'), specialty: 'Pulmonologist', hospital: 'Narayana Health', experience: '14 yrs', image: 'AN' },
    { id: 'doc9', name: 'Dr. Sunita Agarwal', email: 'sunita@healthsync.com', password: simpleHash('doctor123'), specialty: 'Endocrinologist', hospital: 'BLK Hospital', experience: '19 yrs', image: 'SA' },
    { id: 'doc10', name: 'Dr. Rahul Gupta', email: 'rahul@healthsync.com', password: simpleHash('doctor123'), specialty: 'Gastroenterologist', hospital: 'Sir Ganga Ram', experience: '13 yrs', image: 'RG' },
    { id: 'doc11', name: 'Dr. Pooja Malhotra', email: 'pooja@healthsync.com', password: simpleHash('doctor123'), specialty: 'Ophthalmologist', hospital: 'Eye Care Centre', experience: '11 yrs', image: 'PM' },
    { id: 'doc12', name: 'Dr. Anil Sharma', email: 'anil@healthsync.com', password: simpleHash('doctor123'), specialty: 'Urologist', hospital: 'Safdarjung Hospital', experience: '17 yrs', image: 'AS' },
    { id: 'doc13', name: 'Dr. Ritu Verma', email: 'ritu@healthsync.com', password: simpleHash('doctor123'), specialty: 'Psychiatrist', hospital: 'VIMHANS', experience: '20 yrs', image: 'RV' },
    { id: 'doc14', name: 'Dr. Manish Kapoor', email: 'manish@healthsync.com', password: simpleHash('doctor123'), specialty: 'ENT Specialist', hospital: 'Max Healthcare', experience: '15 yrs', image: 'MK' },
    { id: 'doc15', name: 'Dr. Lakshmi Nair', email: 'lakshmi@healthsync.com', password: simpleHash('doctor123'), specialty: 'Oncologist', hospital: 'Tata Memorial', experience: '25 yrs', image: 'LN' },
    { id: 'doc16', name: 'Dr. Sanjay Joshi', email: 'sanjay@healthsync.com', password: simpleHash('doctor123'), specialty: 'Rheumatologist', hospital: 'AIIMS Delhi', experience: '14 yrs', image: 'SJ' },
    { id: 'doc17', name: 'Dr. Deepa Chauhan', email: 'deepa@healthsync.com', password: simpleHash('doctor123'), specialty: 'Pediatrician', hospital: 'Rainbow Hospital', experience: '16 yrs', image: 'DC' },
    { id: 'doc18', name: 'Dr. Abhishek Tiwari', email: 'abhishek@healthsync.com', password: simpleHash('doctor123'), specialty: 'Dentist', hospital: 'Clove Dental', experience: '8 yrs', image: 'AT' },
    // AYUSH practitioners (match PLATFORM_DOCTORS doc19–doc25) so AYUSH-pathway bookings reach a doctor portal
    { id: 'doc19', name: 'Dr. Vasant Lad', email: 'vasant@healthsync.com', password: simpleHash('doctor123'), specialty: 'Ayurvedic Physician', hospital: 'AyurCare Center', experience: '25 yrs', image: 'VL' },
    { id: 'doc20', name: 'Dr. Smita Naram', email: 'smita@healthsync.com', password: simpleHash('doctor123'), specialty: 'Panchakarma Specialist', hospital: 'Vedic Healing', experience: '18 yrs', image: 'SN' },
    { id: 'doc21', name: 'Dr. Batra', email: 'batra@healthsync.com', password: simpleHash('doctor123'), specialty: 'Homeopath', hospital: 'Batra Clinic', experience: '30 yrs', image: 'DB' },
    { id: 'doc22', name: 'Dr. Ratan Kumar', email: 'ratan@healthsync.com', password: simpleHash('doctor123'), specialty: 'Homeopath', hospital: 'Online Homeo', experience: '12 yrs', image: 'RK' },
    { id: 'doc23', name: 'Dr. Aditi Sharma', email: 'aditi@healthsync.com', password: simpleHash('doctor123'), specialty: 'Ayurvedic Physician', hospital: 'Patanjali Wellness', experience: '15 yrs', image: 'AS' },
    { id: 'doc24', name: 'Dr. Rohan Nambiar', email: 'rohan@healthsync.com', password: simpleHash('doctor123'), specialty: 'Ayurvedic Orthopedic', hospital: 'Kerala Ayurveda', experience: '22 yrs', image: 'RN' },
    { id: 'doc25', name: 'Dr. Neha Gupta', email: 'neha@healthsync.com', password: simpleHash('doctor123'), specialty: 'Ayurvedic Dermatologist', hospital: 'Jiva Ayurveda', experience: '10 yrs', image: 'NG' },
];

export function getDoctorAccounts(): DoctorAccount[] {
    // Re-seed whenever the account count changes
    const seededCount = getStorage('hs_doctors_seeded_count');
    if (!seededCount || seededCount !== DOCTOR_ACCOUNTS.length) {
        setStorage('hs_doctor_accounts', DOCTOR_ACCOUNTS);
        setStorage('hs_doctors_seeded', true);
        setStorage('hs_doctors_seeded_count', DOCTOR_ACCOUNTS.length);
    }
    return getStorage('hs_doctor_accounts') || DOCTOR_ACCOUNTS;
}

export function loginDoctor(email: string, password: string): { success: boolean; doctor?: DoctorAccount; error?: string } {
    const docs = getDoctorAccounts();
    // Trim: mobile keyboards often append a trailing space
    const doc = docs.find(d => d.email.toLowerCase() === email.trim().toLowerCase());
    if (!doc) return { success: false, error: 'No doctor account with this email' };
    if (doc.password !== simpleHash(password.trim())) return { success: false, error: 'Incorrect password' };
    return { success: true, doctor: doc };
}

export const getCurrentDoctor = (): DoctorAccount | null => getStorage('hs_current_doctor');
export const setCurrentDoctor = (doc: DoctorAccount) => setStorage('hs_current_doctor', doc);
export const clearCurrentDoctor = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('hs_current_doctor');
};

// Get all appointments for a specific doctor (across all users)
export function getDoctorAppointments(doctorId: string): (Appointment & { patientName: string; patientEmail: string })[] {
    const users = getAllUsers();
    const results: (Appointment & { patientName: string; patientEmail: string })[] = [];
    for (const user of users) {
        const apts: Appointment[] = getStorage(`hs_appointments_${user.id}`) || [];
        for (const apt of apts) {
            if (apt.doctorId === doctorId) {
                results.push({ ...apt, patientName: user.name, patientEmail: user.email });
            }
        }
    }
    return results;
}

// Get patient data for doctor view (filters reports to only shared ones)
export function getPatientData(userId: string, doctorId?: string) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    let reports: MedicalReport[] = getStorage(`hs_reports_${userId}`) || [];
    if (doctorId) {
        reports = reports.filter(r => r.sharedWith?.includes(doctorId));
    }
    return {
        profile: user,
        vitals: getStorage(`hs_vitals_${userId}`) || [],
        reports,
        journeys: getStorage(`hs_journeys_${userId}`) || [],
        chatHistory: getStorage(`hs_chat_${userId}`) || [],
        prescriptions: getPatientPrescriptions(userId),
        intakeSummaries: getIntakeSummaries(userId),
    };
}

// ---------- Generate unique IDs ----------
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ---------- Patient Journey State ----------
export const getActiveJourney = (userId: string): PatientJourney | null => {
    const journeys: PatientJourney[] = getStorage(`hs_patient_journeys_${userId}`) || [];
    return journeys.find(j => j.currentStep !== JourneyStep.COMPLETED && j.currentStep !== JourneyStep.EMERGENCY) || null;
};

export const saveJourney = (journey: PatientJourney) => {
    const key = `hs_patient_journeys_${journey.userId}`;
    const all: PatientJourney[] = getStorage(key) || [];
    const index = all.findIndex(j => j.id === journey.id);
    if (index >= 0) all[index] = journey;
    else all.push(journey);
    setStorage(key, all);
};

// Still being worked through (journeys left at PATIENT_PORTAL/RECOVERY by the old simulated approval count as finished)
export const isInProgress = (j: PatientJourney | null): boolean =>
    !!j && !j.verified && j.currentStep !== JourneyStep.PATIENT_PORTAL && j.currentStep !== JourneyStep.RECOVERY;

// New check-in: resume an unfinished journey, but never reuse one whose plan was already approved
export const startJourney = (userId: string, reasonForVisit: string): PatientJourney => {
    const now = new Date().toISOString();
    const active = getActiveJourney(userId);
    if (active && isInProgress(active)) {
        const resumed = { ...active, reasonForVisit, currentStep: JourneyStep.INTAKE, updatedAt: now };
        saveJourney(resumed);
        return resumed;
    }
    if (active) saveJourney({ ...active, currentStep: JourneyStep.COMPLETED, updatedAt: now });
    const fresh: PatientJourney = { id: generateId(), userId, currentStep: JourneyStep.INTAKE, reasonForVisit, createdAt: now, updatedAt: now };
    saveJourney(fresh);
    return fresh;
};

// Patient home shows the most recent doctor-approved plan, even after a newer check-in has started
export const getLatestApprovedJourney = (userId: string): PatientJourney | null =>
    ((getStorage(`hs_patient_journeys_${userId}`) || []) as PatientJourney[])
        .filter(j => j.verified)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;

// Where each journey step lives in the app
export const journeyPath = (step: JourneyStep): string => ({
    [JourneyStep.MEDIKIOSK]: '/journey/medikiosk',
    [JourneyStep.DIGITAL_TWIN]: '/journey/digital-twin',
    [JourneyStep.BOOKING]: '/journey/booking',
    [JourneyStep.REPORTS]: '/journey/reports',
    [JourneyStep.TIMELINE]: '/journey/reports',
    [JourneyStep.CONSULTATION]: '/journey/consultation',
    [JourneyStep.AI_ANALYSIS]: '/journey/care-plan',
    [JourneyStep.DRAFT_PLAN]: '/journey/care-plan',
    [JourneyStep.DOCTOR_APPROVAL]: '/journey/care-plan',
    [JourneyStep.PATIENT_PORTAL]: '/journey/patient-portal',
    [JourneyStep.RECOVERY]: '/journey/patient-portal',
} as Partial<Record<JourneyStep, string>>)[step] || '/journey/intake';

export const getJourneyById = (userId: string, journeyId: string): PatientJourney | null => {
    const all: PatientJourney[] = getStorage(`hs_patient_journeys_${userId}`) || [];
    return all.find(j => j.id === journeyId) || null;
};

// Profiles store 'female' | 'male' | 'other' | 'unspecified' (sign-up) or 'Female' | 'Male' | … (older onboarding)
export const sexOf = (gender?: string): 'female' | 'male' | null => {
    const g = gender?.toLowerCase();
    return g === 'female' || g === 'male' ? g : null;
};

// ---------- Care pipeline: consultation → AI draft → doctor approval → patient portal ----------
export type JourneyWithPatient = PatientJourney & { patient: UserProfile };

// Every journey booked with this doctor, newest first (doctor portal)
export const getDoctorJourneys = (doctorId: string): JourneyWithPatient[] =>
    getAllUsers()
        .flatMap(patient => (getStorage(`hs_patient_journeys_${patient.id}`) as PatientJourney[] || []).map(j => ({ ...j, patient })))
        .filter(j => j.doctorId === doctorId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const findJourney = (journeyId: string): JourneyWithPatient | null => {
    for (const patient of getAllUsers()) {
        const j = getJourneyById(patient.id, journeyId);
        if (j) return { ...j, patient };
    }
    return null;
};

export const getCarePlans = (userId: string): CarePlanDraft[] => getStorage(`hs_careplans_${userId}`) || [];
export const getCarePlan = (journey: PatientJourney): CarePlanDraft | null =>
    getCarePlans(journey.userId).find(p => p.id === journey.draftCarePlanId) || null;
export const saveCarePlan = (userId: string, plan: CarePlanDraft) => {
    const others = getCarePlans(userId).filter(p => p.id !== plan.id);
    setStorage(`hs_careplans_${userId}`, [...others, plan]);
};

// Recording consent: each side writes only its own key, so the two devices never overwrite each other
export const getConsent = (journeyId: string) => ({
    patient: getStorage(`hs_consent_patient_${journeyId}`) === true,
    doctor: getStorage(`hs_consent_doctor_${journeyId}`) === true,
});
export const setConsent = (journeyId: string, who: 'patient' | 'doctor', value: boolean) =>
    setStorage(`hs_consent_${who}_${journeyId}`, value);

// Live transcript lines are appended server-side (shared-store cloudAppendTranscript) and read back here after sync
// 'room' = single microphone at a physical visit (doctor and patient on one recording)
export interface TranscriptLine { speaker: 'doctor' | 'patient' | 'room'; text: string; at: string }
export const getTranscript = (journeyId: string): TranscriptLine[] => getStorage(`hs_transcript_${journeyId}`) || [];

// Daily recovery check-ins, seen by patient and doctor
export interface RecoveryCheckin { date: string; feeling: number; tookMedicines: boolean; note?: string }
export const getCheckins = (journeyId: string): RecoveryCheckin[] => getStorage(`hs_checkins_${journeyId}`) || [];
export const saveCheckin = (journeyId: string, checkin: RecoveryCheckin) => {
    const others = getCheckins(journeyId).filter(c => c.date !== checkin.date);
    setStorage(`hs_checkins_${journeyId}`, [...others, checkin].sort((a, b) => a.date.localeCompare(b.date)));
};
// Recovery rate over the last 7 check-ins: 60% how the patient feels (1–5), 40% medicine adherence
export const recoveryRate = (checkins: RecoveryCheckin[]): number | null => {
    const recent = checkins.slice(-7);
    if (recent.length === 0) return null;
    const score = recent.reduce((sum, c) => sum + ((c.feeling - 1) / 4) * 0.6 + (c.tookMedicines ? 0.4 : 0), 0);
    return Math.round((score / recent.length) * 100);
};

// Medicine cart (persisted so prescribed medicines can be added after approval)
export interface CartItem { name: string; quantity: number; price: number }
export const getCart = (userId: string): CartItem[] => getStorage(`hs_cart_${userId}`) || [];
export const setCart = (userId: string, items: CartItem[]) => setStorage(`hs_cart_${userId}`, items);

// ---------- Audit Logs ----------
export const addAuditLog = (log: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const all: AuditLogEntry[] = getStorage('hs_global_audit_logs') || [];
    all.push({
        ...log,
        id: generateId(),
        timestamp: new Date().toISOString()
    });
    setStorage('hs_global_audit_logs', all);
};

// ---------- Intake Summaries ----------
export const saveIntakeSummary = (summary: ClinicalIntakeSummary) => {
    const key = `hs_intake_${summary.userId}`;
    const all: ClinicalIntakeSummary[] = getStorage(key) || [];
    all.push(summary);
    setStorage(key, all);
};

export const getIntakeSummaries = (userId: string): ClinicalIntakeSummary[] => {
    return getStorage(`hs_intake_${userId}`) || [];
};

// ---------- Theme ----------
export const getTheme = (): string => {
    if (typeof window === 'undefined') return 'light';
    const user = getCurrentUser();
    if (user && user.theme) return user.theme;
    return 'light';
};
export const setTheme = (theme: string) => {
    if (typeof window === 'undefined') return;
    // Save to user profile so it is per-user
    const user = getCurrentUser();
    if (user) {
        const updated = { ...user, theme };
        setCurrentUser(updated);
    }
    document.documentElement.setAttribute('data-theme', theme);
};

// Doctor-specific theme (isolated from user)
export const getDoctorTheme = (): string => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('healthsync_doctor_theme') || 'light';
};
export const setDoctorTheme = (theme: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('healthsync_doctor_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
};

// ---------- Export all data ----------
export function exportUserData(): string {
    const user = getCurrentUser();
    if (!user) return '{}';
    const data = {
        profile: user,
        vitals: getVitals(),
        reports: getReports().map(r => ({ ...r, fileData: undefined })),
        journeys: getJourneys(),
        chatHistory: getChatHistory(),
        digitalTwinChat: getDigitalTwinChat(),
        familyMembers: getFamilyMembers(),
        appointments: getAppointments(),
        exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
}

export function deleteUserData(): void {
    const user = getCurrentUser();
    if (!user) return;
    const uid = user.id;
    const keysToRemove = [
        `hs_journeys_${uid}`, `hs_vitals_${uid}`, `hs_family_${uid}`,
        `hs_reports_${uid}`, `hs_chat_${uid}`, `hs_dt_chat_${uid}`,
        `hs_appointments_${uid}`, `hs_prescriptions_${uid}`, `hs_symptoms_${uid}`,
        `hs_orders_${uid}`, `hs_notifications_${uid}`,
        'healthsync_current_user',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    // Remove user from registry
    const users = getAllUsers().filter(u => u.id !== uid);
    saveAllUsers(users);
}

// ---------- Family member operations ----------
export const removeFamilyMember = (id: string) => {
    const members = getFamilyMembers().filter(m => m.id !== id);
    setStorage(userKey('hs_family'), members);
};

// ---------- Symptom Log (Digital Twin) ----------
export const getSymptomLog = (): Record<string, string> => getStorage(userKey('hs_symptoms')) || {};
export const setSymptomLog = (symptoms: Record<string, string>) => setStorage(userKey('hs_symptoms'), symptoms);

// ---------- Appointment operations ----------
export const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    const apts = getAppointments().map(a => a.id === id ? { ...a, ...updates } : a);
    setStorage(userKey('hs_appointments'), apts);
};

// ---------- Prescriptions ----------
export const getPatientPrescriptions = (userId: string): Prescription[] => getStorage(`hs_prescriptions_${userId}`) || [];
export const getDoctorPrescriptions = (doctorId: string): Prescription[] => {
    const users = getAllUsers();
    const all: Prescription[] = [];
    for (const user of users) {
        const presc: Prescription[] = getStorage(`hs_prescriptions_${user.id}`) || [];
        all.push(...presc.filter(p => p.doctorId === doctorId));
    }
    return all;
};
export const addPrescription = (prescription: Prescription) => {
    const existing: Prescription[] = getStorage(`hs_prescriptions_${prescription.recipientUserId}`) || [];
    existing.push(prescription);
    setStorage(`hs_prescriptions_${prescription.recipientUserId}`, existing);
};

// ---------- Call Logs ----------
export const getCallLogs = (id: string, role: 'doctor' | 'user'): CallLog[] => {
    const all: CallLog[] = getStorage('hs_call_logs') || [];
    return role === 'doctor' ? all.filter(c => c.doctorId === id) : all.filter(c => c.userId === id);
};
export const addCallLog = (call: CallLog) => {
    const logs: CallLog[] = getStorage('hs_call_logs') || [];
    logs.push(call);
    setStorage('hs_call_logs', logs);
};
export const updateCallLog = (id: string, updates: Partial<CallLog>) => {
    const logs: CallLog[] = getStorage('hs_call_logs') || [];
    const updated = logs.map(c => c.id === id ? { ...c, ...updates } : c);
    setStorage('hs_call_logs', updated);
};
export const getActiveCall = (): CallLog | null => {
    const logs: CallLog[] = getStorage('hs_call_logs') || [];
    return logs.find(c => c.status === 'ringing' || c.status === 'ongoing') || null;
};

// ---------- Doctor Notes ----------
export const getDoctorNotes = (doctorId: string, patientId?: string): DoctorNote[] => {
    const all: DoctorNote[] = getStorage(`hs_doctor_notes_${doctorId}`) || [];
    return patientId ? all.filter(n => n.patientId === patientId) : all;
};
export const addDoctorNote = (note: DoctorNote) => {
    const notes: DoctorNote[] = getStorage(`hs_doctor_notes_${note.doctorId}`) || [];
    notes.push(note);
    setStorage(`hs_doctor_notes_${note.doctorId}`, notes);
};

// ---------- Doctor Profile ----------
export const getDoctorProfile = (doctorId: string): DoctorAccount & { phone?: string; bio?: string; qualifications?: string[]; consultationFee?: number } => {
    const profile = getStorage(`hs_doctor_profile_${doctorId}`);
    if (profile) return profile;
    const docs = getDoctorAccounts();
    return docs.find(d => d.id === doctorId) as DoctorAccount;
};
export const updateDoctorProfile = (doctorId: string, updates: Record<string, unknown>) => {
    const current = getDoctorProfile(doctorId);
    const updated = { ...current, ...updates };
    setStorage(`hs_doctor_profile_${doctorId}`, updated);
};

// ---------- Report Sharing ----------
export const shareReportWithDoctor = (userId: string, reportId: string, doctorId: string) => {
    const reports: MedicalReport[] = getStorage(`hs_reports_${userId}`) || [];
    const updated = reports.map(r => {
        if (r.id === reportId) {
            const shared = r.sharedWith || [];
            if (!shared.includes(doctorId)) shared.push(doctorId);
            return { ...r, sharedWith: shared };
        }
        return r;
    });
    setStorage(`hs_reports_${userId}`, updated);
};
export const autoShareReportsWithDoctor = (userId: string, doctorId: string) => {
    const reports: MedicalReport[] = getStorage(`hs_reports_${userId}`) || [];
    const updated = reports.map(r => {
        const shared = r.sharedWith || [];
        if (!shared.includes(doctorId)) shared.push(doctorId);
        return { ...r, sharedWith: shared };
    });
    setStorage(`hs_reports_${userId}`, updated);
};

export interface ABHARecord {
    id: string;
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    bloodGroup: string;
    lastUpdated: string;
    medicalHistory: string[];
    conditions: string[];
    medications: string[];
}

export const abhaDatabase: ABHARecord[] = [
    {
        id: '91-1234-5678-9012',
        name: 'Rahul Sharma',
        age: 45,
        gender: 'Male',
        bloodGroup: 'B+',
        lastUpdated: '2023-10-15T10:30:00Z',
        medicalHistory: ['Appendectomy (2015)', 'Mild Asthma'],
        conditions: ['Hypertension'],
        medications: ['Amlodipine 5mg'],
    },
    {
        id: '91-9876-5432-1098',
        name: 'Priya Patel',
        age: 32,
        gender: 'Female',
        bloodGroup: 'O+',
        lastUpdated: '2023-11-20T14:45:00Z',
        medicalHistory: ['No significant history'],
        conditions: ['Polycystic Ovary Syndrome (PCOS)'],
        medications: ['Metformin 500mg'],
    }
];

// --- Mock Data Initialization ----------
// ---------- Notifications ----------
export const getNotifications = (): Notification[] => getStorage(userKey('hs_notifications')) || [];
export const addNotification = (notif: Notification) => {
    // Store under the notification's userId, not the current user
    const key = notif.userId ? `hs_notifications_${notif.userId}` : userKey('hs_notifications');
    const all: Notification[] = getStorage(key) || [];
    all.push(notif);
    setStorage(key, all);
};
export const markNotificationRead = (id: string) => {
    const all = getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    setStorage(userKey('hs_notifications'), all);
};
export const markAllNotificationsRead = () => {
    const all = getNotifications().map(n => ({ ...n, read: true }));
    setStorage(userKey('hs_notifications'), all);
};
export const getUnreadNotificationCount = (): number => getNotifications().filter(n => !n.read).length;

// ---------- Vision Analysis Storage ----------
export interface VisionAnalysis {
    id: string;
    userId: string;
    imageDescription: string;
    analysis: string;
    timestamp: string;
}
export const saveVisionAnalysis = (analysis: VisionAnalysis) => {
    const key = userKey('hs_vision_analyses');
    const all: VisionAnalysis[] = getStorage(key) || [];
    all.push(analysis);
    setStorage(key, all);
};
export const getVisionAnalyses = (): VisionAnalysis[] => getStorage(userKey('hs_vision_analyses')) || [];

// ---------- Medicine Orders ----------
export const getOrders = (): MedicineOrder[] => getStorage(userKey('hs_orders')) || [];
export const addOrder = (order: MedicineOrder) => {
    const all = getStorage(`${order.userId}_hs_orders`) || [];
    all.push(order);
    setStorage(`${order.userId}_hs_orders`, all);
};
export const updateOrderStatus = (id: string, userId: string, status: MedicineOrder['status']) => {
    const key = `${userId}_hs_orders`;
    const all: MedicineOrder[] = getStorage(key) || [];
    const updated = all.map(o => o.id === id ? { ...o, status } : o);
    setStorage(key, updated);
};
export const getAllOrders = (): MedicineOrder[] => {
    const users = getAllUsers();
    let allOrders: MedicineOrder[] = [];
    for (const u of users) {
        const orders = getStorage(`${u.id}_hs_orders`) || [];
        allOrders = allOrders.concat(orders);
    }
    // Sort by orderDate descending
    return allOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
};
export const generateTransactionId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let txn = 'TXN';
    for (let i = 0; i < 12; i++) txn += chars.charAt(Math.floor(Math.random() * chars.length));
    return txn;
};
// ----------------------------------------------------
// Emergency Requests
// ----------------------------------------------------

export interface EmergencyRequest {
    id: string;
    type: 'blood' | 'bed' | 'machine';
    status: 'Pending' | 'Processing' | 'Completed' | 'Dispatched' | 'Admitted';
    time: string;
    
    // For Blood
    bloodType?: string;
    location?: string;
    
    // For Bed
    ward?: string;
    patientName?: string;
    
    // For Machine
    machine?: string;
}

export const getEmergencyRequests = (): EmergencyRequest[] => {
    return getStorage('healthsync_emergency_requests') || [];
};

export const addEmergencyRequest = (req: EmergencyRequest) => {
    const all = getEmergencyRequests();
    all.unshift(req);
    setStorage('healthsync_emergency_requests', all);
};

export const updateEmergencyRequestStatus = (id: string, status: EmergencyRequest['status']) => {
    const all = getEmergencyRequests();
    const idx = all.findIndex(r => r.id === id);
    if (idx !== -1) {
        all[idx].status = status;
        setStorage('healthsync_emergency_requests', all);
    }
};
