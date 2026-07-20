import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAudioStorageUsage, AUDIO_MAX_BYTES } from "@/lib/storage";
import { getSheetMusicStorageUsage, SHEET_MUSIC_MAX_BYTES } from "@/lib/sheet-music-storage";
import StorageFileList, { type StorageFile } from "@/components/StorageFileList";

// Live quota snapshot — never statically cache it.
export const dynamic = "force-dynamic";

const BUDGET_BYTES = 1024 * 1024 * 1024; // Supabase free-tier total (1GB), shared across all buckets

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default async function AdminStoragePage() {
  const [audioUsage, sheetMusicUsage] = await Promise.all([
    getAudioStorageUsage(),
    getSheetMusicStorageUsage(),
  ]);

  const [audioOwners, sheetMusicOwners] = await Promise.all([
    prisma.songMedia.findMany({
      where: { mediaUrl: { in: audioUsage.files.map((f) => f.url) } },
      select: {
        mediaUrl: true,
        label: true,
        section: { select: { part: true, song: { select: { title: true } } } },
      },
    }),
    prisma.songSheetMusic.findMany({
      where: { fileUrl: { in: sheetMusicUsage.files.map((f) => f.url) } },
      select: { fileUrl: true, label: true, song: { select: { title: true } } },
    }),
  ]);
  const audioOwnerByUrl = new Map(audioOwners.map((o) => [o.mediaUrl, o]));
  const sheetMusicOwnerByUrl = new Map(sheetMusicOwners.map((o) => [o.fileUrl, o]));

  const files: StorageFile[] = [
    ...audioUsage.files.map((f) => {
      const owner = audioOwnerByUrl.get(f.url);
      return {
        url: f.url,
        bytes: f.bytes,
        kind: "Audio" as const,
        name: owner?.label ?? f.path,
        songTitle: owner?.section.song.title ?? "Not attached to any song",
        part: owner?.section.part,
      };
    }),
    ...sheetMusicUsage.files.map((f) => {
      const owner = sheetMusicOwnerByUrl.get(f.url);
      return {
        url: f.url,
        bytes: f.bytes,
        kind: "Sheet Music" as const,
        name: owner?.label ?? f.path,
        songTitle: owner?.song.title ?? "Not attached to any song",
      };
    }),
  ];

  const totalBytes = audioUsage.totalBytes + sheetMusicUsage.totalBytes;
  const fileCount = audioUsage.fileCount + sheetMusicUsage.fileCount;
  const pctUsed = Math.min(100, Math.round((totalBytes / BUDGET_BYTES) * 100));
  // Nonce-based CSP (#17) doesn't cover inline style attributes — only
  // <style>/<script> elements get Next's automatic nonce tagging — so the
  // progress bar's dynamic width goes through a nonced <style> tag instead
  // of a React style={{width}} attribute. pctUsed is a plain server-computed
  // integer (0-100), never user input, so interpolating it directly is safe.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Storage</h1>
      <p className="mb-6 text-sm text-ink/60">
        Direct audio-file and sheet-music uploads only — pasted links (YouTube, Drive, SoundCloud)
        don&apos;t count against this budget.
      </p>

      <div className="rounded-lg border border-ink/10 bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink">
            {formatMB(totalBytes)} of {formatMB(BUDGET_BYTES)} used
          </span>
          <span className="text-xs text-ink/50">{fileCount} file{fileCount === 1 ? "" : "s"}</span>
        </div>
        <style nonce={nonce}>{`.storage-usage-bar-fill { width: ${pctUsed}%; }`}</style>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className={`storage-usage-bar-fill h-full rounded-full ${pctUsed >= 90 ? "bg-red-600" : pctUsed >= 70 ? "bg-amber-500" : "bg-ink"}`}
          />
        </div>
        {pctUsed >= 90 && (
          <p className="mt-2 text-xs text-red-600">
            Close to the free-tier limit — new uploads may start failing soon.
          </p>
        )}
      </div>

      <StorageFileList files={files} />

      <p className="mt-6 text-xs text-ink/40">
        App-level per-file caps: {AUDIO_MAX_BYTES / (1024 * 1024)}MB audio, {SHEET_MUSIC_MAX_BYTES / (1024 * 1024)}MB
        sheet music — both below Supabase&apos;s 50MB hard limit.
      </p>
    </div>
  );
}
