"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { appBaseUrl } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/get-session";
import { logActivity } from "@/lib/activity-log";

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_PER_EMAIL = 5; // per email+IP combo
const LOGIN_MAX_PER_IP = 30; // across all emails from one IP — slows down credential spraying

const RESET_REQUEST_WINDOW_MS = 60 * 60_000; // 1 hour
const RESET_REQUEST_MAX_PER_EMAIL = 3; // per email+IP combo
const RESET_REQUEST_MAX_PER_IP = 10; // across all emails from one IP

/**
 * Rate-limits then delegates to Supabase's signInWithPassword. Must be a
 * server action (not a direct client-side supabase.auth call) so the rate
 * limiter — which Supabase's API has no concept of — actually gates
 * attempts, and so the session cookie gets written via the request-bound
 * SSR client.
 */
export async function login(email: string, password: string): Promise<{ error?: string }> {
  const normalizedEmail = email.toLowerCase();
  const ip = getClientIp(await headers());
  const ipKey = `login:ip:${ip}`;
  const emailKey = `login:email:${normalizedEmail}:${ip}`;

  // Always tick both counters (don't short-circuit on the first failure) so
  // a caller can't keep one window artificially fresh by tripping the other
  // first — Promise.all runs both, never conditionally skipping the second
  // the way `await a() || await b()` would.
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(ipKey, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS),
    checkRateLimit(emailKey, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS),
  ]);
  if (!ipOk || !emailOk) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) return { error: "Incorrect email or password." };

  const profile = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (profile) {
    await logActivity(`${profile.name} <${profile.email}>`, "login");
  }

  return {};
}

// Total response time this action always pads up to, regardless of which
// branch ran — closes the timing gap between "account doesn't exist"/
// rate-limited (a Prisma lookup only, ~250-350ms steady-state against the
// live Supabase project) and "account exists" (a Prisma lookup plus a real
// Supabase Auth API call, ~520-1250ms observed). #18: the previous fixed
// 80ms delay only padded the fast branch, so it never actually closed this
// gap — a bare 80ms addition still left the fast branch 150-1000ms faster
// than the real one. 1400ms sits comfortably above every steady-state and
// most tail-latency samples measured directly against production Supabase
// (see the issue for the measurement); occasional network-jitter outliers
// on either branch can still exceed it, which is an accepted residual risk
// given real network calls have unbounded tail latency — combined with the
// per-email/per-IP rate limits above, exploiting the residual gap would
// need sustained statistical sampling over many hours, not a single probe.
const RESET_TIMING_TARGET_MS = 1400;

/**
 * Supabase Auth sends the reset email itself (via its dashboard-configured
 * SMTP, pointed at Resend) — this action's job is just the rate-limiting
 * and account-existence gating in front of it, which Supabase's own API
 * doesn't do for us. Always returns {} regardless of outcome; the caller
 * shows the same "if that email matches an account..." message either way.
 */
export async function requestPasswordReset(email: string): Promise<Record<string, never>> {
  const start = Date.now();
  const normalizedEmail = email.toLowerCase();
  const ip = getClientIp(await headers());

  // Both counters always tick, same reasoning as the login rate limit —
  // Promise.all runs both rather than short-circuiting.
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(`reset:ip:${ip}`, RESET_REQUEST_MAX_PER_IP, RESET_REQUEST_WINDOW_MS),
    checkRateLimit(`reset:email:${normalizedEmail}:${ip}`, RESET_REQUEST_MAX_PER_EMAIL, RESET_REQUEST_WINDOW_MS),
  ]);
  // A rate-limited request takes the exact same silent, timing-masked path
  // as a nonexistent account below — never surfacing "you're rate-limited"
  // would itself confirm the email is real.
  const user = ipOk && emailOk ? await prisma.user.findUnique({ where: { email: normalizedEmail } }) : null;

  if (user && user.status === "active") {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${appBaseUrl()}/auth/confirm?type=recovery&next=/reset-password`,
    });
  }

  // Do not reveal whether the account exists, whether it's rate-limited, or
  // which — including via response timing. Pad total elapsed time up to a
  // fixed target rather than sleeping a fixed amount only on one branch, so
  // this stays correct regardless of which branch ran or how long its real
  // work actually took.
  const elapsed = Date.now() - start;
  if (elapsed < RESET_TIMING_TARGET_MS) {
    await new Promise((resolve) => setTimeout(resolve, RESET_TIMING_TARGET_MS - elapsed));
  }

  return {};
}

/**
 * Called by the accept-invite page right after supabase.auth.updateUser({password})
 * succeeds (a session already exists at that point, established via
 * /auth/confirm's verifyOtp exchange) — flips the Prisma profile from
 * "invited" to "active".
 */
export async function activateInvitedProfile(): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  await prisma.user.update({ where: { id: session.user.id }, data: { status: "active" } });
  return {};
}
