import { prisma } from "@/lib/prisma";

/**
 * Distributed fixed-window rate limiter, backed by Supabase Postgres (#20).
 * Replaces the earlier per-process in-memory Map, which kept independent
 * counters per serverless instance — silently weakening the effective limit
 * under Vercel's multi-instance scaling. The increment-or-reset logic runs
 * as a single atomic `INSERT ... ON CONFLICT` so concurrent requests for the
 * same key (from different instances) can't race each other into an
 * inflated count.
 */

// Opportunistic cleanup, same idea as the old in-memory sweep — just against
// the shared table now. Per-process throttle only; if several instances
// each decide to sweep around the same time that's harmless (a plain
// DELETE ... WHERE is safe under concurrency), just occasionally redundant.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: Date) {
  if (now.getTime() - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now.getTime();
  // Fire-and-forget — cleanup never blocks the actual rate-limit check.
  prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lte: now } } }).catch((err) => {
    console.error("rate-limit sweep failed:", err);
  });
}

/**
 * Returns true if `key` is still within `limit` hits per `windowMs`,
 * incrementing its counter as a side effect. Returns false once the
 * window's limit is exceeded (the counter is still incremented so a
 * caller who keeps retrying doesn't get a longer effective window).
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  sweep(now);

  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" (key, count, "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1 ELSE "RateLimitBucket".count + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END
    RETURNING count, "resetAt"
  `;

  return rows[0].count <= limit;
}

/** Minutes remaining until `key`'s window resets (0 if it already has, or doesn't exist). */
export async function rateLimitResetMinutes(key: string): Promise<number> {
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!bucket) return 0;
  return Math.max(0, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 60_000));
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
