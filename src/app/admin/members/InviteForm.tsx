"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "@/lib/actions/member-actions";

export default function InviteForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setInviteLink(null);
    const result = await inviteMember(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInviteLink(result.inviteLink ?? null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-ink">Invite a member</h2>
      <form action={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Name
          <input name="name" required className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Email
          <input name="email" type="email" required className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select name="role" defaultValue="chorister" className="rounded border border-ink/20 px-3 py-2">
            <option value="chorister">Chorister</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90">
          Send invite
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {inviteLink && (
        <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
          Invite created — share this link with them manually (real email delivery isn&apos;t
          wired up yet): <code className="break-all">{inviteLink}</code>
        </p>
      )}
    </div>
  );
}
