"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth-actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { resetLink, emailSent: sent } = await requestPasswordReset(email);
    setDevLink(resetLink ?? null);
    setEmailSent(sent ?? false);
    setSubmitted(true);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Forgot password</h1>
      <p className="mb-6 text-sm text-ink/60">
        Enter your email and, if it matches an active account, we&apos;ll send a link to reset
        your password.
      </p>
      {submitted ? (
        <div className="rounded border border-ink/10 bg-ink/5 p-4 text-sm text-ink/80">
          <p>If that email matches an account, a reset link is on its way.</p>
          {devLink && !emailSent && (
            <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
              <strong>Email not sent</strong> (no email provider configured, or the send failed)
              — here&apos;s the link that would be emailed:{" "}
              <Link href={devLink} className="underline">
                {devLink}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-ink/20 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90"
          >
            Send reset link
          </button>
        </form>
      )}
      <Link href="/login" className="mt-4 text-sm text-ink hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
