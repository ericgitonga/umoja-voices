"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setRequiredNewPassword } from "@/lib/actions/profile-actions";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await setRequiredNewPassword(password);
    if (result.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    // Refresh the JWT so it stops carrying mustChangePassword=true, then
    // move on — otherwise src/proxy.ts would redirect right back here.
    await update();
    router.push(session?.user.role === "admin" ? "/admin" : "/songs");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Set a new password</h1>
      <p className="mb-6 text-sm text-slate-600">
        This account was set up with a default password. Choose your own before continuing.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm password
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Set password"}
        </button>
      </form>
    </div>
  );
}
