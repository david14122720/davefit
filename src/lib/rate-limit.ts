/**
 * Simple Rate Limiting en memoria para Node.js.
 * Nota: En un entorno distribuido o serverless, se debería usar Redis.
 */

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

export function checkRateLimit(ip: string, limit = 50, windowMs = 60000) {
    const now = Date.now();

    if (!store[ip]) {
        store[ip] = {
            count: 1,
            resetTime: now + windowMs,
        };
        return { success: true, remaining: limit - 1 };
    }

    const record = store[ip];

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return { success: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { success: false, remaining: 0 };
    }

    record.count++;
    return { success: true, remaining: limit - record.count };
}
