import { Redis } from '@upstash/redis';

// Create a lazy-initialized Redis client
let redis: Redis | null = null;

export function getRedis(): Redis {
    if (!redis) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
        });
    }
    return redis;
}
