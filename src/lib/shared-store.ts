// Client-side helpers to read/write shared data via the /api/store route (Upstash Redis)
// Calls use these server-side array ops directly; everything else syncs through store.ts

import { useEffect, useState } from 'react';
import type { UserProfile, Appointment, CallLog, Prescription, Notification, TranscriptLine } from './store';
import { syncFromCloud } from './store';

const API = '/api/store';

// ---------- Background sync ----------

// Hydrate localStorage from the server before first render, then keep pulling while the tab is visible.
export function useCloudSync(intervalMs = 4000): boolean {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let alive = true;
        Promise.race([syncFromCloud(), new Promise(r => setTimeout(r, 2500))]).then(() => { if (alive) setReady(true); });
        const id = setInterval(() => { if (document.visibilityState === 'visible') syncFromCloud(); }, intervalMs);
        return () => { alive = false; clearInterval(id); };
    }, [intervalMs]);
    return ready;
}

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

async function cloudPush(key: string, item: unknown): Promise<boolean> {
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

async function cloudUpdate(key: string, matchField: string, matchValue: string, updates: Record<string, unknown>): Promise<boolean> {
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

export async function cloudGetAllUsers(): Promise<UserProfile[]> {
    return (await cloudGet<UserProfile[]>('healthsync_users')) || [];
}

// ---------- Appointments ----------

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

// ---------- Consultation transcript ----------

// Server-side append so doctor and patient devices can both add lines without overwriting each other
export async function cloudAppendTranscript(journeyId: string, line: TranscriptLine): Promise<void> {
    await cloudPush(`hs_transcript_${journeyId}`, line);
}

// ---------- Prescriptions ----------

export async function cloudAddPrescription(prescription: Prescription): Promise<void> {
    await cloudPush(`hs_prescriptions_${prescription.recipientUserId}`, prescription);
}

// ---------- Notifications ----------

export async function cloudAddNotification(notif: Notification): Promise<void> {
    await cloudPush(`hs_notifications_${notif.userId}`, notif);
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
        prescriptions: (await cloudGet<Prescription[]>(`hs_prescriptions_${userId}`)) || [],
    };
}
