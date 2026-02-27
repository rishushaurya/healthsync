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

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
      @media (max-width: 768px) {
        .main-content {
          margin-left: 0 !important;
          padding: 16px !important;
          padding-top: 60px !important;
        }
      }
    `;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    if (!authorized) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: '3px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'rotate-slow 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <LanguageProvider>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{
                    flex: 1,
                    marginLeft: 260,
                    padding: '24px 32px',
                    minHeight: '100vh',
                    position: 'relative',
                    zIndex: 1,
                    transition: 'margin-left 0.3s ease',
                }}
                    className="main-content"
                >
                    {children}
                </main>
                <IncomingCallOverlay />
            </div>
        </LanguageProvider>
    );
}
