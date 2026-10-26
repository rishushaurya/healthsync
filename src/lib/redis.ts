import { Redis } from '@upstash/redis';

type KV = {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<unknown>;
    keys: (pattern: string) => Promise<string[]>;
    mget: (...keys: string[]) => Promise<unknown[]>;
};

let kv: KV | null = null;

// Upstash Redis when configured, otherwise an in-process store so local demos
// (doctor + patient on two browsers/devices hitting the same dev server) still sync.
export function getRedis(): KV {
    if (kv) return kv;
    const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    if (url && token) {
        kv = new Redis({ url, token }) as unknown as KV;
    } else {
        // seniordev: single-process memory, lost on restart and not shared across serverless instances; set UPSTASH_* for deploys.
        const g = globalThis as { __hsKV?: Map<string, unknown> };
        const mem = (g.__hsKV ??= new Map());
        kv = {
            get: async (k) => mem.get(k) ?? null,
            set: async (k, v) => { mem.set(k, v); return 'OK'; },
            keys: async (p) => [...mem.keys()].filter(k => k.startsWith(p.replace('*', ''))),
            mget: async (...ks) => ks.map(k => mem.get(k) ?? null),
        };
    }
    return kv;
}
