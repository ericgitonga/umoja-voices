import { prisma } from "@/lib/prisma";
import { getAudioStorageUsage, AUDIO_MAX_BYTES } from "@/lib/storage";

// Live quota snapshot — never statically cache it.
export const dynamic = "force-dynamic";

const BUDGET_BYTES = 1024 * 1024 * 1024; // Supabase free-tier total (1GB)

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default async function AdminStoragePage() {
  const usage = await getAudioStorageUsage();

  const owners = await prisma.songMedia.findMany({
    where: { mediaUrl: { in: usage.files.map((f) => f.url) } },
    select: {
      mediaUrl: true,
      label: true,
      section: { select: { part: true, song: { select: { id: true, title: true } } } },
    },
  });
  const ownerByUrl = new Map(owners.map((o) => [o.mediaUrl, o]));

  const pctUsed = Math.min(100, Math.round((usage.totalBytes / BUDGET_BYTES) * 100));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Storage</h1>
      <p className="mb-6 text-sm text-ink/60">
        Direct audio-file uploads only — pasted links (YouTube, Drive, SoundCloud) don&apos;t count
        against this budget.
      </p>

      <div className="rounded-lg border border-ink/10 bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink">
            {formatMB(usage.totalBytes)} of {formatMB(BUDGET_BYTES)} used
          </span>
          <span className="text-xs text-ink/50">{usage.fileCount} file{usage.fileCount === 1 ? "" : "s"}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className={`h-full rounded-full ${pctUsed >= 90 ? "bg-red-600" : pctUsed >= 70 ? "bg-amber-500" : "bg-ink"}`}
            style={{ width: `${pctUsed}%` }}
          />
        </div>
        {pctUsed >= 90 && (
          <p className="mt-2 text-xs text-red-600">
            Close to the free-tier limit — new uploads may start failing soon.
          </p>
        )}
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {usage.files.map((f) => {
          const owner = ownerByUrl.get(f.url);
          return (
            <li
              key={f.path}
              className="flex items-center justify-between rounded border border-ink/10 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{owner?.label ?? f.path}</p>
                <p className="truncate text-xs text-ink/50">
                  {owner?.section.song.title ?? "Not attached to any song"}
                  {owner?.section.part ? ` — ${owner.section.part}` : ""}
                </p>
              </div>
              <span className="ml-3 shrink-0 text-xs text-ink/60">{formatMB(f.bytes)}</span>
            </li>
          );
        })}
        {usage.files.length === 0 && <p className="text-sm text-ink/50">No uploaded audio files yet.</p>}
      </ul>

      <p className="mt-6 text-xs text-ink/40">
        App-level per-file cap: {AUDIO_MAX_BYTES / (1024 * 1024)}MB, below Supabase&apos;s 50MB hard limit.
      </p>
    </div>
  );
}
