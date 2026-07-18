"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth-actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { resetLink } = await requestPasswordReset(email);
    setDevLink(resetLink ?? null);
    setSubmitted(true);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Forgot password</h1>
      <p className="mb-6 text-sm text-slate-600">
        Enter your email and, if it matches an active account, we&apos;ll send a link to reset
        your password.
      </p>
      {submitted ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>If that email matches an account, a reset link is on its way.</p>
          {devLink && (
            <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
              <strong>Dev-only stand-in:</strong> no email provider is wired up in the POC yet,
              so here&apos;s the link that would be emailed:{" "}
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
              className="rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"
          >
            Send reset link
          </button>
        </form>
      )}
      <Link href="/login" className="mt-4 text-sm text-indigo-700 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
