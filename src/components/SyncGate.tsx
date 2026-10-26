'use client';

import { usePathname } from 'next/navigation';
import { useCloudSync } from '@/lib/shared-store';

// Pages read localStorage on mount, so hold them until the first cross-device sync lands (max 2.5s).
// The public landing page needs no data and renders immediately.
export default function SyncGate({ children }: { children: React.ReactNode }) {
    const ready = useCloudSync();
    const pathname = usePathname();
    if (ready || pathname === '/') return <>{children}</>;
    return (
        <div role="status" aria-label="Loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <div className="spinner" />
        </div>
    );
}
