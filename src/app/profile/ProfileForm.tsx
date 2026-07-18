"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/profile-actions";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await updateProfile(formData);
    setStatus(result.error ?? "Saved.");
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input value={email} disabled className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" defaultValue={name} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        New password (leave blank to keep current)
        <input name="newPassword" type="password" minLength={8} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      {status && <p className="text-sm text-slate-600">{status}</p>}
      <button type="submit" className="rounded bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800">
        Save
      </button>
    </form>
  );
}
