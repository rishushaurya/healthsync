'use client';

import Sidebar from '@/components/layout/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/store';
import { LanguageProvider } from '@/lib/LanguageProvider';
import IncomingCallOverlay from '@/components/calls/IncomingCallOverlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            router.replace('/auth');
            return;
        }
        if (!user.onboardingComplete) {
            router.replace('/onboarding');
            return;
        }
        // Apply saved theme
        if (user.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        }
        setAuthorized(true);
    }, [router]);

    if (!authorized) {
        return (
            <div role="status" aria-label="Loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <LanguageProvider>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main className="app-main main-content">
                    {children}
                </main>
                <IncomingCallOverlay />
            </div>
        </LanguageProvider>
    );
}
