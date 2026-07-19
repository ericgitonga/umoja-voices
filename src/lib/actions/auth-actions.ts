"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { appBaseUrl } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/get-session";

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

  // Order matters: always tick both counters (don't short-circuit on the
  // first failure) so a caller can't keep one window artificially fresh by
  // tripping the other first.
  const ipOk = checkRateLimit(ipKey, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS);
  const emailOk = checkRateLimit(emailKey, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS);
  if (!ipOk || !emailOk) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) return { error: "Incorrect email or password." };

  return {};
}

/** Slows the "account doesn't exist" branch down to roughly match the
 *  "account exists, reset requested" branch — a bare early-return would let
 *  an attacker enumerate valid emails by timing this action's response. */
function timingSafetyDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

/**
 * Supabase Auth sends the reset email itself (via its dashboard-configured
 * SMTP, pointed at Resend) — this action's job is just the rate-limiting
 * and account-existence gating in front of it, which Supabase's own API
 * doesn't do for us. Always returns {} regardless of outcome; the caller
 * shows the same "if that email matches an account..." message either way.
 */
export async function requestPasswordReset(email: string): Promise<Record<string, never>> {
  const normalizedEmail = email.toLowerCase();
  const ip = getClientIp(await headers());

  // Both counters always tick, same reasoning as the login rate limit.
  // A rate-limited request takes the exact same silent, timing-masked path
  // as a nonexistent account below — never surfacing "you're rate-limited"
  // would itself confirm the email is real.
  const ipOk = checkRateLimit(`reset:ip:${ip}`, RESET_REQUEST_MAX_PER_IP, RESET_REQUEST_WINDOW_MS);
  const emailOk = checkRateLimit(
    `reset:email:${normalizedEmail}:${ip}`,
    RESET_REQUEST_MAX_PER_EMAIL,
    RESET_REQUEST_WINDOW_MS
  );

  const user = ipOk && emailOk ? await prisma.user.findUnique({ where: { email: normalizedEmail } }) : null;

  if (!user || user.status !== "active") {
    // Do not reveal whether the account exists, whether it's rate-limited,
    // or which — including via response timing.
    await timingSafetyDelay();
    return {};
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${appBaseUrl()}/auth/confirm?type=recovery&next=/reset-password`,
  });

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
