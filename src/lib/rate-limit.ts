/**
 * In-memory fixed-window rate limiter — a POC stand-in for a distributed
 * store (e.g. Upstash Redis). This is correct for a single Node process
 * (how the app runs today: local dev, or a single long-lived server), but
 * each serverless instance would keep its own independent counters once
 * deployed to Vercel/multi-instance hosting, silently weakening the limit.
 * Swapping in a real distributed store is tracked separately (see SKILL.md's
 * Security First section) — do not treat this as production-grade as-is.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Cheap unbounded-growth guard: sweep expired buckets occasionally rather
// than on every call.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Returns true if `key` is still within `limit` hits per `windowMs`,
 * incrementing its counter as a side effect. Returns false once the
 * window's limit is exceeded (the counter is still incremented so a
 * caller who keeps retrying doesn't get a longer effective window).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

/** Minutes remaining until `key`'s window resets (0 if it already has, or doesn't exist). */
export function rateLimitResetMinutes(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  return Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 60_000));
}

type HeaderSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function readHeader(headers: HeaderSource, name: string): string | null {
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(name: string): string | null }).get(name);
  }
  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/**
 * Best-effort client IP from proxy-set headers (x-forwarded-for, the
 * standard set by Vercel and most reverse proxies). Accepts either a Web
 * Headers instance (Server Actions via next/headers) or a plain header
 * record (NextAuth's credentials authorize callback). Falls back to a
 * constant when running with no proxy in front (e.g. local dev) — every
 * request then shares one IP bucket, which is strictly more restrictive
 * than intended but never less, so it fails safe rather than open.
 */
export function getClientIp(headers: HeaderSource): string {
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = readHeader(headers, "x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
