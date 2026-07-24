import { prisma } from "@/lib/prisma";
import { ACTIVITY_ACTION_LABEL, type ActivityAction } from "@/lib/constants";
import { formatEAT } from "@/lib/format-eat";
import { parseUserAgent } from "@/lib/user-agent";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type PageSize } from "@/lib/pagination";
import ActivityPaginationControls from "./ActivityPaginationControls";

// This page reads live data — never statically cache it.
export const dynamic = "force-dynamic";

// Broadened at #49 from #50's narrow login-plus-a-few-mutations slice into
// the app's data-change trail (song edits, member status/deletion, every
// logistics create/delete). Extended to #42's pagination at the app
// owner's request once the log had grown large enough to matter -- unlike
// Storage/Members, this list is DB-fetched per page (skip/take) rather than
// paginated client-side over an already-fetched array, since the whole
// point is to reach back further than a single bounded fetch ever could.
// "View all" still caps at VIEW_ALL_LIMIT rather than being truly unbounded
// -- matches the existing precedent of every Storage bucket listing
// (getAudioStorageUsage() et al.) capping at 1000.
const VIEW_ALL_LIMIT = 1000;

function parsePageSize(raw: string | undefined): PageSize {
  if (raw === "all") return "all";
  const n = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly (number | "all")[]).includes(n) ? (n as PageSize) : DEFAULT_PAGE_SIZE;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const pageSize = parsePageSize(params.pageSize);
  const page = Math.max(1, Number(params.page) || 1);

  const totalItems = await prisma.activityLog.count();
  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: pageSize === "all" ? undefined : (page - 1) * pageSize,
    take: pageSize === "all" ? VIEW_ALL_LIMIT : pageSize,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Activity</h1>
      <p className="mb-6 text-sm text-ink/60">
        Logins, song/member/logistics changes, and their request context (IP, browser, OS).
        Timestamps shown in East Africa Time.
        {pageSize === "all" && totalItems > VIEW_ALL_LIMIT
          ? ` Showing the most recent ${VIEW_ALL_LIMIT} of ${totalItems} events.`
          : ""}
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
      <ActivityPaginationControls totalItems={totalItems} page={page} pageSize={pageSize} />
    </div>
  );
}
