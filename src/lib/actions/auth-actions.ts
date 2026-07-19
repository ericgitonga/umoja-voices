"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail, appBaseUrl, isEmailConfigured } from "@/lib/email";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
const INVITE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MIN_PASSWORD_LENGTH = 8;

const RESET_REQUEST_WINDOW_MS = 60 * 60_000; // 1 hour
const RESET_REQUEST_MAX_PER_EMAIL = 3; // per email+IP combo
const RESET_REQUEST_MAX_PER_IP = 10; // across all emails from one IP

/** Slows the "account doesn't exist" branch down to roughly match the
 *  "account exists, token created" branch — a bare early-return would let
 *  an attacker enumerate valid emails by timing this action's response. */
function timingSafetyDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

/**
 * Sends the reset link via Resend when RESEND_API_KEY is configured (see
 * src/lib/email.ts), calling it directly rather than through Supabase
 * Auth's built-in reset email — the Supabase Auth migration (#10) hasn't
 * landed yet. Still returns the link either way, as an on-screen fallback
 * if RESEND_API_KEY is unset or the send fails.
 */
export async function requestPasswordReset(email: string): Promise<{ resetLink?: string; emailSent?: boolean }> {
  const normalizedEmail = email.toLowerCase();
  const ip = getClientIp(await headers());

  // Both counters always tick, same reasoning as the login rate limit in
  // src/lib/auth.ts. A rate-limited request takes the exact same silent,
  // timing-masked path as a nonexistent account below — never surfacing
  // "you're rate-limited" would itself confirm the email is real.
  const ipOk = checkRateLimit(`reset:ip:${ip}`, RESET_REQUEST_MAX_PER_IP, RESET_REQUEST_WINDOW_MS);
  const emailOk = checkRateLimit(
    `reset:email:${normalizedEmail}:${ip}`,
    RESET_REQUEST_MAX_PER_EMAIL,
    RESET_REQUEST_WINDOW_MS
  );

  const user = ipOk && emailOk
    ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
    : null;

  if (!user || user.status !== "active") {
    // Do not reveal whether the account exists, whether it's rate-limited,
    // or which — including via response timing.
    await timingSafetyDelay();
    return {};
  }

  const token = crypto.randomBytes(24).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetLink = `/reset-password/${token}`;
  const emailSent = isEmailConfigured();
  if (emailSent) {
    // Fire-and-forget via after(): awaiting Resend's network latency here
    // would make this branch measurably slower than the invalid-account
    // branch above, reopening the account-enumeration timing side-channel
    // timingSafetyDelay() exists to close. after() keeps the send alive
    // past the response without the caller waiting on it.
    const resetUrl = `${appBaseUrl()}${resetLink}`;
    after(() =>
      sendPasswordResetEmail({ to: user.email, resetUrl }).catch((err) =>
        console.error("Resend password-reset email failed:", err)
      )
    );
  }

  return { resetLink, emailSent };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ error?: string }> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return {};
}

export async function acceptInvite(
  token: string,
  password: string
): Promise<{ error?: string }> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { email: invite.email.toLowerCase() },
      data: { passwordHash, status: "active", mustChangePassword: false },
    }),
    prisma.invite.update({ where: { token }, data: { acceptedAt: new Date() } }),
  ]);

  return {};
}
