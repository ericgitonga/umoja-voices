"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { resetPassword } from "@/lib/actions/auth-actions";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await resetPassword(token, password);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
        <p className="text-slate-700">Password updated — redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Set a new password</h1>
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"
        >
          Set password
        </button>
      </form>
    </div>
  );
}
