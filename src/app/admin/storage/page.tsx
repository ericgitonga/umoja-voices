import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAudioStorageUsage, AUDIO_MAX_BYTES } from "@/lib/storage";
import { getSheetMusicStorageUsage, SHEET_MUSIC_MAX_BYTES } from "@/lib/sheet-music-storage";
import { getVideoStorageUsage, VIDEO_MAX_BYTES } from "@/lib/video-storage";
import { getProfilePhotoStorageUsage, PROFILE_PHOTO_MAX_BYTES } from "@/lib/profile-photo-storage";
import StorageFileList, { type StorageFile } from "@/components/StorageFileList";

// Live quota snapshot — never statically cache it.
export const dynamic = "force-dynamic";

const BUDGET_BYTES = 1024 * 1024 * 1024; // Supabase free-tier total (1GB), shared across all buckets

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default async function AdminStoragePage() {
  const [audioUsage, sheetMusicUsage, videoUsage, profilePhotoUsage] = await Promise.all([
    getAudioStorageUsage(),
    getSheetMusicStorageUsage(),
    getVideoStorageUsage(),
    getProfilePhotoStorageUsage(),
  ]);

  const [audioOwners, sheetMusicOwners, videoOwners, aboutMediaOwners, profilePhotoOwners] = await Promise.all([
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
    prisma.songMedia.findMany({
      where: { mediaUrl: { in: videoUsage.files.map((f) => f.url) } },
      select: {
        mediaUrl: true,
        label: true,
        section: { select: { part: true, song: { select: { title: true } } } },
      },
    }),
    // About-page media (#59) can land in either the audio or video bucket,
    // unlike the old singleton AboutPageVideo which was video-only.
    prisma.aboutPageMedia.findMany({
      where: { mediaUrl: { in: [...audioUsage.files.map((f) => f.url), ...videoUsage.files.map((f) => f.url)] } },
      select: { mediaUrl: true, label: true },
    }),
    prisma.user.findMany({
      where: { photoUrl: { in: profilePhotoUsage.files.map((f) => f.url) } },
      select: { photoUrl: true, name: true },
    }),
  ]);
  const audioOwnerByUrl = new Map(audioOwners.map((o) => [o.mediaUrl, o]));
  const sheetMusicOwnerByUrl = new Map(sheetMusicOwners.map((o) => [o.fileUrl, o]));
  const videoOwnerByUrl = new Map(videoOwners.map((o) => [o.mediaUrl, o]));
  const aboutMediaOwnerByUrl = new Map(aboutMediaOwners.map((o) => [o.mediaUrl, o]));
  const profilePhotoOwnerByUrl = new Map(profilePhotoOwners.map((o) => [o.photoUrl, o]));

  const files: StorageFile[] = [
    ...audioUsage.files.map((f) => {
      const owner = audioOwnerByUrl.get(f.url);
      const aboutOwner = aboutMediaOwnerByUrl.get(f.url);
      return {
        url: f.url,
        bytes: f.bytes,
        kind: "Audio" as const,
        name: owner?.label ?? aboutOwner?.label ?? f.path,
        songTitle: owner?.section.song.title ?? (aboutOwner ? "About page" : "Not attached to any song"),
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
    ...videoUsage.files.map((f) => {
      const owner = videoOwnerByUrl.get(f.url);
      const aboutOwner = aboutMediaOwnerByUrl.get(f.url);
      return {
        url: f.url,
        bytes: f.bytes,
        kind: "Video" as const,
        name: owner?.label ?? aboutOwner?.label ?? f.path,
        songTitle: owner?.section.song.title ?? (aboutOwner ? "About page" : "Not attached to any song"),
        part: owner?.section.part,
      };
    }),
    ...profilePhotoUsage.files.map((f) => {
      const owner = profilePhotoOwnerByUrl.get(f.url);
      return {
        url: f.url,
        bytes: f.bytes,
        kind: "Profile Photo" as const,
        name: owner?.name ?? f.path,
        songTitle: owner?.name ?? "Not attached to any user",
      };
    }),
  ];

  const totalBytes =
    audioUsage.totalBytes + sheetMusicUsage.totalBytes + videoUsage.totalBytes + profilePhotoUsage.totalBytes;
  const fileCount =
    audioUsage.fileCount + sheetMusicUsage.fileCount + videoUsage.fileCount + profilePhotoUsage.fileCount;
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
        Direct audio, video, and sheet-music uploads only — pasted links (YouTube, Drive, SoundCloud)
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
        App-level per-file caps: {AUDIO_MAX_BYTES / (1024 * 1024)}MB audio, {VIDEO_MAX_BYTES / (1024 * 1024)}MB video,{" "}
        {SHEET_MUSIC_MAX_BYTES / (1024 * 1024)}MB sheet music, {PROFILE_PHOTO_MAX_BYTES / (1024 * 1024)}MB profile
        photo — all below Supabase&apos;s 50MB hard limit.
      </p>
    </div>
  );
}
