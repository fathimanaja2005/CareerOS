/**
 * Very small in-memory per-IP rate limiter.
 *
 * Limits are per server instance: on Vercel each warm function instance has its
 * own map, so this stops accidental hammering and casual abuse, not a determined
 * attacker. For production-grade limits use a shared store (e.g. Upstash Redis).
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 10) * 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 10);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so the map cannot grow forever.
  if (buckets.size > 5000) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
