/**
 * Simple in-memory rate limiter.
 * Works per serverless instance — sufficient for a small gym (5 staff).
 * Resets on cold start, but prevents burst brute-force attacks.
 */

interface Entry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const store = new Map<string, Entry>();

// Clean up old entries every 100 calls to avoid memory leaks
let callCount = 0;
function maybePrune() {
  if (++callCount % 100 !== 0) return;
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now - entry.windowStart > 60 * 60 * 1000) store.delete(key);
  });
}

export function checkRateLimit(
  key: string,
  opts: { maxAttempts: number; windowMs: number; blockMs?: number }
): { allowed: boolean; retryAfterSeconds?: number } {
  maybePrune();
  const now = Date.now();
  const { maxAttempts, windowMs, blockMs = windowMs } = opts;

  const entry = store.get(key);

  // Currently hard-blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  // New window
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  // Within window — increment
  entry.count++;

  if (entry.count > maxAttempts) {
    entry.blockedUntil = now + blockMs;
    return { allowed: false, retryAfterSeconds: Math.ceil(blockMs / 1000) };
  }

  return { allowed: true };
}
