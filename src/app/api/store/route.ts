import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// Unified API for shared data stored in Upstash Redis
// IMPORTANT: @upstash/redis auto-serializes/deserializes JSON,
// so we do NOT call JSON.stringify/JSON.parse ourselves.

// Only app data and WebRTC signaling keys — this is not a general-purpose KV.
const SYNC_PREFIXES = ['hs_', 'healthsync_'];
const allowed = (key: unknown): key is string =>
    typeof key === 'string' && [...SYNC_PREFIXES, 'rtc_'].some(p => key.startsWith(p));

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const redis = getRedis();

        // ?all=1 → every app key, used by the client to hydrate localStorage
        if (searchParams.get('all')) {
            // seniordev: returns the whole dataset; scope by user/doctor when data outgrows a demo.
            const keys = (await Promise.all(SYNC_PREFIXES.map(p => redis.keys(`${p}*`)))).flat();
            const values = keys.length ? await redis.mget(...keys) : [];
            return NextResponse.json({ data: Object.fromEntries(keys.map((k, i) => [k, values[i]])) });
        }

        const key = searchParams.get('key');
        if (!allowed(key)) return NextResponse.json({ error: 'Missing or invalid key' }, { status: 400 });

        const data = await redis.get(key);
        // @upstash/redis already parses JSON — return as-is
        return NextResponse.json({ data: data ?? null });
    } catch (error) {
        console.error('Store GET error:', error);
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { key, value } = await request.json();
        if (!allowed(key)) return NextResponse.json({ error: 'Missing or invalid key' }, { status: 400 });

        const redis = getRedis();
        // @upstash/redis auto-stringifies, so pass value directly
        await redis.set(key, value);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Store POST error:', error);
        return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { key, action, item, matchField, matchValue, updates } = await request.json();
        if (!allowed(key)) return NextResponse.json({ error: 'Missing or invalid key' }, { status: 400 });

        const redis = getRedis();
        const raw = await redis.get(key);

        // @upstash/redis auto-parses, so raw is already an array or null
        let arr: unknown[] = [];
        if (Array.isArray(raw)) {
            arr = raw;
        } else if (typeof raw === 'string') {
            // Fallback: if somehow stored as a string, try parsing
            try { arr = JSON.parse(raw); } catch { arr = []; }
        }

        if (action === 'push') {
            arr.push(item);
        } else if (action === 'update') {
            arr = arr.map((entry: unknown) => {
                const obj = entry as Record<string, unknown>;
                if (obj[matchField] === matchValue) {
                    return { ...obj, ...updates };
                }
                return obj;
            });
        } else if (action === 'remove') {
            arr = arr.filter((entry: unknown) => {
                const obj = entry as Record<string, unknown>;
                return obj[matchField] !== matchValue;
            });
        }

        // @upstash/redis auto-stringifies — pass array directly
        await redis.set(key, arr);
        return NextResponse.json({ success: true, data: arr });
    } catch (error) {
        console.error('Store PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
    }
}
