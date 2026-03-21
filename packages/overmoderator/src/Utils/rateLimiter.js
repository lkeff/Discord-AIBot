/**
 * @file rateLimiter.js
 * @description Per-user rate limiting for AI API calls
 */

const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // per user

/** @type {Map<string, { count: number, windowStart: number }>} */
const userLimits = new Map();

/**
 * Check whether a user is within their rate limit.
 * @param {string} userId
 * @returns {{ allowed: boolean, retryAfterMs?: number }}
 */
function checkRateLimit(userId) {
    const now = Date.now();
    const entry = userLimits.get(userId);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
        userLimits.set(userId, { count: 1, windowStart: now });
        return { allowed: true };
    }

    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfterMs = WINDOW_MS - (now - entry.windowStart);
        return { allowed: false, retryAfterMs };
    }

    entry.count += 1;
    return { allowed: true };
}

// Prevent unbounded map growth by cleaning up stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [userId, entry] of userLimits.entries()) {
        if (now - entry.windowStart > WINDOW_MS * 2) {
            userLimits.delete(userId);
        }
    }
}, WINDOW_MS * 5);

module.exports = { checkRateLimit };
