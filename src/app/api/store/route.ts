import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// Unified API for shared data stored in Upstash Redis
// Supports: GET (read), POST (write), PATCH (update item in array), DELETE (remove)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

        const redis = getRedis();
        const data = await redis.get(key);
        return NextResponse.json({ data: data ?? null });
    } catch (error) {
        console.error('Store GET error:', error);
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { key, value } = await request.json();
        if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

        const redis = getRedis();
        await redis.set(key, JSON.stringify(value));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Store POST error:', error);
        return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { key, action, item, matchField, matchValue, updates } = await request.json();
        if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

        const redis = getRedis();
        const raw = await redis.get(key);
        let arr: unknown[] = [];
        if (typeof raw === 'string') {
            arr = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
            arr = raw;
        }

        if (action === 'push') {
            // Add item to array
            arr.push(item);
        } else if (action === 'update') {
            // Update matching items
            arr = arr.map((entry: unknown) => {
                const obj = entry as Record<string, unknown>;
                if (obj[matchField] === matchValue) {
                    return { ...obj, ...updates };
                }
                return obj;
            });
        } else if (action === 'remove') {
            // Remove matching items
            arr = arr.filter((entry: unknown) => {
                const obj = entry as Record<string, unknown>;
                return obj[matchField] !== matchValue;
            });
        }

        await redis.set(key, JSON.stringify(arr));
        return NextResponse.json({ success: true, data: arr });
    } catch (error) {
        console.error('Store PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
    }
}
