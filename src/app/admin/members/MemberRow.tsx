"use client";

import { useRouter } from "next/navigation";
import { updateMemberRole, setMemberStatus } from "@/lib/actions/member-actions";

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

  return (
    <li className="flex items-center justify-between rounded border border-slate-200 px-4 py-3">
      <div>
        <p className="font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">
          {email} &middot; {status}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <select
          defaultValue={role}
          onChange={async (e) => {
            await updateMemberRole(id, e.target.value);
            router.refresh();
          }}
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="chorister">Chorister</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={async () => {
            await setMemberStatus(id, status === "disabled" ? "active" : "disabled");
            router.refresh();
          }}
          className="text-xs text-red-600 hover:underline"
        >
          {status === "disabled" ? "Reactivate" : "Deactivate"}
        </button>
      </div>
    </li>
  );
}
