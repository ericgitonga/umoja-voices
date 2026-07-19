"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole, setMemberStatus, deleteMember } from "@/lib/actions/member-actions";

export default function MemberRow({
  id,
  name,
  email,
  role,
  status,
}: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Controlled, and reset on every failed mutation — an uncontrolled
  // <select defaultValue> would keep showing the rejected choice even
  // after the server blocks it (e.g. the self-lockout guard), which reads
  // as a silent success that never actually happened.
  const [currentRole, setCurrentRole] = useState(role);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-ink">{name}</p>
        <p className="text-xs text-ink/50">
          {email} &middot; {status}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <select
          value={currentRole}
          onChange={async (e) => {
            const next = e.target.value;
            setError(null);
            const result = await updateMemberRole(id, next);
            if (result.error) {
              setError(result.error);
            } else {
              setCurrentRole(next);
            }
            router.refresh();
          }}
          className="rounded border border-ink/20 px-2 py-1 text-xs"
        >
          <option value="chorister">Chorister</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={async () => {
            setError(null);
            const result = await setMemberStatus(id, status === "disabled" ? "active" : "disabled");
            if (result.error) setError(result.error);
            router.refresh();
          }}
          className="text-xs text-red-600 hover:underline"
        >
          {status === "disabled" ? "Reactivate" : "Deactivate"}
        </button>
        <button
          onClick={async () => {
            if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
            setError(null);
            const result = await deleteMember(id);
            if (result.error) setError(result.error);
            router.refresh();
          }}
          className="text-xs text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
