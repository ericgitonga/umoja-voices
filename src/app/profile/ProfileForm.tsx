"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/profile-actions";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);

    const result = await updateProfile(formData);
    if (result.error) {
      setStatus(result.error);
      return;
    }

    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword) {
      if (newPassword.length < 8) {
        setStatus("Name saved. Password must be at least 8 characters — password not changed.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setStatus(`Name saved. Password change failed: ${error.message}`);
        return;
      }
    }

    setStatus("Saved.");
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input value={email} disabled className="rounded border border-ink/10 bg-ink/5 px-3 py-2 text-ink/50" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" defaultValue={name} className="rounded border border-ink/20 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        New password (leave blank to keep current)
        <input name="newPassword" type="password" minLength={8} className="rounded border border-ink/20 px-3 py-2" />
      </label>
      {status && <p className="text-sm text-ink/60">{status}</p>}
      <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
        Save
      </button>
    </form>
  );
}
