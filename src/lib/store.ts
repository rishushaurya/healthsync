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
    intent: 'diagnosed' | 'undiagnosed' | 'wellness' | '';
    onboardingComplete: boolean;
    createdAt: string;
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

const setStorage = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
};

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
    const doc = docs.find(d => d.email.toLowerCase() === email.toLowerCase());
    if (!doc) return { success: false, error: 'No doctor account with this email' };
    if (doc.password !== simpleHash(password)) return { success: false, error: 'Incorrect password' };
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
    };
}

// ---------- Generate unique IDs ----------
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    return localStorage.getItem('healthsync_doctor_theme') || 'dark';
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
    const all = getOrders();
    all.push(order);
    setStorage(userKey('hs_orders'), all);
};
export const updateOrderStatus = (id: string, status: MedicineOrder['status']) => {
    const all = getOrders().map(o => o.id === id ? { ...o, status } : o);
    setStorage(userKey('hs_orders'), all);
};
export const generateTransactionId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let txn = 'TXN';
    for (let i = 0; i < 12; i++) txn += chars.charAt(Math.floor(Math.random() * chars.length));
    return txn;
};
