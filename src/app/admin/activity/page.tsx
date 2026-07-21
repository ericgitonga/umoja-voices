import { prisma } from "@/lib/prisma";
import { ACTIVITY_ACTION_LABEL, type ActivityAction } from "@/lib/constants";
import { formatEAT } from "@/lib/format-eat";
import { parseUserAgent } from "@/lib/user-agent";

// This page reads live data — never statically cache it.
export const dynamic = "force-dynamic";

// Broadened at #49 from #50's narrow login-plus-a-few-mutations slice into
// the app's data-change trail (song edits, member status/deletion, every
// logistics create/delete) — still a flat recent-N list, no
// pagination/filtering (out of scope here; #42 covers pagination for the
// Storage and Members lists specifically, not this one).
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
        Most recent {RECENT_LIMIT} events — logins, song/member/logistics changes, and their
        request context (IP, browser, OS). Timestamps shown in East Africa Time.
      </p>

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const { browser, os } = parseUserAgent(entry.userAgent);
          return (
            <li key={entry.id} className="rounded-lg border border-ink/10 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">
                  {ACTIVITY_ACTION_LABEL[entry.action as ActivityAction] ?? entry.action}
                </span>
                <span className="text-ink/50">{formatEAT(entry.createdAt)}</span>
              </div>
              <p className="text-ink/70">{entry.userLabel}</p>
              {entry.entityType && (
                <p className="text-ink/50">
                  {entry.entityType}
                  {entry.entityLabel ? `: ${entry.entityLabel}` : ""}
                </p>
              )}
              {entry.detail && <p className="text-ink/50">{entry.detail}</p>}
              {(entry.ipAddress || entry.userAgent) && (
                <p className="mt-1 text-xs text-ink/40">
                  {entry.ipAddress ?? "unknown IP"} — {browser} on {os}
                </p>
              )}
            </li>
          );
        })}
        {entries.length === 0 && <p className="text-ink/50">No activity recorded yet.</p>}
      </ul>
    </div>
  );
}
