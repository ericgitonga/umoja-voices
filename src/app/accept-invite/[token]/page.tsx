"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/auth-actions";

export default function AcceptInvitePage({
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
    const result = await acceptInvite(token, password);
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
        <p className="text-ink/80">Account activated — redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Welcome to Umoja Voices</h1>
      <p className="mb-6 text-sm text-ink/60">Set a password to activate your account.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90"
        >
          Activate account
        </button>
      </form>
    </div>
  );
}
