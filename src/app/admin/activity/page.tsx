import { prisma } from "@/lib/prisma";
import { ACTIVITY_ACTION_LABEL, type ActivityAction } from "@/lib/constants";

// This page reads live data — never statically cache it.
export const dynamic = "force-dynamic";

// A narrow proof-of-concept slice (#50): login events plus a handful of
// high-value admin mutations, not a full audit trail (see #49 for that
// separate, broader exploration) — so a flat recent-N list is enough for
// now, no pagination/filtering.
const RECENT_LIMIT = 100;

export default async function AdminActivityPage() {
  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Activity</h1>
      <p className="mb-6 text-sm text-ink/60">
        Most recent {RECENT_LIMIT} events — logins and key admin actions only, not a full audit
        trail.
      </p>

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg border border-ink/10 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">
                {ACTIVITY_ACTION_LABEL[entry.action as ActivityAction] ?? entry.action}
              </span>
              <span className="text-ink/50">{entry.createdAt.toLocaleString()}</span>
            </div>
            <p className="text-ink/70">{entry.userLabel}</p>
            {entry.detail && <p className="text-ink/50">{entry.detail}</p>}
          </li>
        ))}
        {entries.length === 0 && <p className="text-ink/50">No activity recorded yet.</p>}
      </ul>
    </div>
  );
}
