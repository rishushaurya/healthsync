// Client-side helpers to read/write shared data via the /api/store route (Upstash Redis)
// This replaces direct localStorage for data that must sync across devices

const API = '/api/store';

// ---------- Low-level helpers ----------

export async function cloudGet<T>(key: string): Promise<T | null> {
    try {
        const res = await fetch(`${API}?key=${encodeURIComponent(key)}`);
        const json = await res.json();
        if (json.data === null || json.data === undefined) return null;
        // The API route + @upstash/redis already returns parsed JSON
        return json.data as T;
    } catch (e) {
        console.error('cloudGet error:', e);
        return null;
    }
}

export async function cloudSet(key: string, value: unknown): Promise<boolean> {
    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
        const json = await res.json();
        return json.success === true;
    } catch (e) {
        console.error('cloudSet error:', e);
        return false;
    }
}

export async function cloudPush(key: string, item: unknown): Promise<boolean> {
    try {
        const res = await fetch(API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, action: 'push', item }),
        });
        const json = await res.json();
        return json.success === true;
    } catch (e) {
        console.error('cloudPush error:', e);
        return false;
    }
}

export async function cloudUpdate(key: string, matchField: string, matchValue: string, updates: Record<string, unknown>): Promise<boolean> {
    try {
        const res = await fetch(API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, action: 'update', matchField, matchValue, updates }),
        });
        const json = await res.json();
        return json.success === true;
    } catch (e) {
        console.error('cloudUpdate error:', e);
        return false;
    }
}

// ---------- User Registry ----------

import type { UserProfile, Appointment, CallLog, Prescription, Notification } from './store';
import { simpleHash } from './store';

export async function cloudGetAllUsers(): Promise<UserProfile[]> {
    return (await cloudGet<UserProfile[]>('healthsync_users')) || [];
}

export async function cloudRegisterUser(user: UserProfile): Promise<{ success: boolean; error?: string }> {
    const users = await cloudGetAllUsers();
    if (users.find(u => u.email.toLowerCase() === user.email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists' };
    }
    users.push(user);
    await cloudSet('healthsync_users', users);
    return { success: true };
}

export async function cloudLoginUser(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const users = await cloudGetAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, error: 'No account found with this email' };
    if (user.password !== simpleHash(password)) return { success: false, error: 'Incorrect password' };
    return { success: true, user };
}

export async function cloudUpdateUser(user: UserProfile): Promise<void> {
    const users = await cloudGetAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) { users[idx] = user; } else { users.push(user); }
    await cloudSet('healthsync_users', users);
}

// ---------- Appointments ----------

export async function cloudGetAppointments(userId: string): Promise<Appointment[]> {
    return (await cloudGet<Appointment[]>(`hs_appointments_${userId}`)) || [];
}

export async function cloudAddAppointment(apt: Appointment): Promise<void> {
    await cloudPush(`hs_appointments_${apt.userId}`, apt);
}

export async function cloudGetDoctorAppointments(doctorId: string): Promise<(Appointment & { patientName: string; patientEmail: string })[]> {
    const users = await cloudGetAllUsers();
    const results: (Appointment & { patientName: string; patientEmail: string })[] = [];
    for (const user of users) {
        const apts = (await cloudGet<Appointment[]>(`hs_appointments_${user.id}`)) || [];
        for (const apt of apts) {
            if (apt.doctorId === doctorId) {
                results.push({ ...apt, patientName: user.name, patientEmail: user.email });
            }
        }
    }
    return results;
}

// ---------- Call Logs ----------

export async function cloudGetCallLogs(id: string, role: 'doctor' | 'user'): Promise<CallLog[]> {
    const all = (await cloudGet<CallLog[]>('hs_call_logs')) || [];
    return role === 'doctor' ? all.filter(c => c.doctorId === id) : all.filter(c => c.userId === id);
}

export async function cloudAddCallLog(call: CallLog): Promise<void> {
    await cloudPush('hs_call_logs', call);
}

export async function cloudUpdateCallLog(id: string, updates: Partial<CallLog>): Promise<void> {
    await cloudUpdate('hs_call_logs', 'id', id, updates as Record<string, unknown>);
}

export async function cloudGetActiveCall(): Promise<CallLog | null> {
    const all = (await cloudGet<CallLog[]>('hs_call_logs')) || [];
    return all.find(c => c.status === 'ringing' || c.status === 'ongoing') || null;
}

// ---------- Prescriptions ----------

export async function cloudGetPatientPrescriptions(userId: string): Promise<Prescription[]> {
    return (await cloudGet<Prescription[]>(`hs_prescriptions_${userId}`)) || [];
}

export async function cloudAddPrescription(prescription: Prescription): Promise<void> {
    await cloudPush(`hs_prescriptions_${prescription.recipientUserId}`, prescription);
}

export async function cloudGetDoctorPrescriptions(doctorId: string): Promise<Prescription[]> {
    const users = await cloudGetAllUsers();
    const all: Prescription[] = [];
    for (const user of users) {
        const presc = (await cloudGet<Prescription[]>(`hs_prescriptions_${user.id}`)) || [];
        all.push(...presc.filter(p => p.doctorId === doctorId));
    }
    return all;
}

// ---------- Notifications ----------

export async function cloudGetNotifications(userId: string): Promise<Notification[]> {
    return (await cloudGet<Notification[]>(`hs_notifications_${userId}`)) || [];
}

export async function cloudAddNotification(notif: Notification): Promise<void> {
    await cloudPush(`hs_notifications_${notif.userId}`, notif);
}

export async function cloudMarkNotificationRead(userId: string, notifId: string): Promise<void> {
    await cloudUpdate(`hs_notifications_${userId}`, 'id', notifId, { read: true });
}

export async function cloudMarkAllNotificationsRead(userId: string): Promise<void> {
    const notifs = await cloudGetNotifications(userId);
    const updated = notifs.map(n => ({ ...n, read: true }));
    await cloudSet(`hs_notifications_${userId}`, updated);
}

// ---------- Patient Data for Doctor View ----------

export async function cloudGetPatientData(userId: string, doctorId?: string) {
    const users = await cloudGetAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    const reports = (await cloudGet<unknown[]>(`hs_reports_${userId}`)) || [];
    const filteredReports = doctorId
        ? reports.filter((r: unknown) => {
            const rep = r as { sharedWith?: string[] };
            return rep.sharedWith?.includes(doctorId);
        })
        : reports;
    return {
        profile: user,
        vitals: (await cloudGet(`hs_vitals_${userId}`)) || [],
        reports: filteredReports,
        journeys: (await cloudGet(`hs_journeys_${userId}`)) || [],
        chatHistory: (await cloudGet(`hs_chat_${userId}`)) || [],
        prescriptions: await cloudGetPatientPrescriptions(userId),
    };
}
