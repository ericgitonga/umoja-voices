import { createAdminClient } from "@/lib/supabase/admin";
import { VIDEO_MAX_BYTES, VIDEO_ALLOWED_EXTENSIONS, VIDEO_ALLOWED_MIME_TYPES } from "@/lib/media-constants";

/**
 * Direct video-file uploads to Supabase Storage (#55) — a separate bucket
 * from song-audio/song-sheet-music since it's a distinct file type with its
 * own quota accounting. Never import this from a client component (pulls in
 * the admin client).
 */

export const VIDEO_BUCKET = "song-video";
export { VIDEO_MAX_BYTES };

function publicUrlPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/`;
}

/** True if this URL points at our own bucket, i.e. we can delete the underlying object. */
export function isOwnVideoUrl(url: string): boolean {
  return url.startsWith(publicUrlPrefix());
}

function storagePathFromUrl(url: string): string | null {
  const prefix = publicUrlPrefix();
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/**
 * Validates and uploads a video file via the admin/service-role client —
 * consistent with this app's pattern of never talking to Storage from the
 * client and not relying on Storage RLS policies.
 */
export async function uploadVideoFile(file: File): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("video/")) {
    return { error: "File must be a video file." };
  }
  if (!VIDEO_ALLOWED_MIME_TYPES.includes(file.type as (typeof VIDEO_ALLOWED_MIME_TYPES)[number])) {
    return { error: "Unsupported video format — use MP4, MOV, or WEBM." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !VIDEO_ALLOWED_EXTENSIONS.includes(ext as (typeof VIDEO_ALLOWED_EXTENSIONS)[number])) {
    return { error: "Unsupported file extension — use .mp4, .mov, or .webm." };
  }

  if (file.size > VIDEO_MAX_BYTES) {
    return { error: `File is too large — max ${VIDEO_MAX_BYTES / (1024 * 1024)}MB.` };
  }

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) {
    return { error: "Upload failed — please try again." };
  }

  return { url: `${publicUrlPrefix()}${path}` };
}

/** No-op if the URL isn't one of ours (e.g. a pasted link) — nothing to clean up. */
export async function deleteVideoFile(url: string): Promise<void> {
  const path = storagePathFromUrl(url);
  if (!path) return;

  const supabase = createAdminClient();
  await supabase.storage.from(VIDEO_BUCKET).remove([path]);
}

export type VideoStorageUsage = {
  totalBytes: number;
  fileCount: number;
  files: { path: string; url: string; bytes: number }[];
};

/** Live usage snapshot for the admin Storage page — no caching, no schema. */
export async function getVideoStorageUsage(): Promise<VideoStorageUsage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).list("", {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error || !data) {
    return { totalBytes: 0, fileCount: 0, files: [] };
  }

  const files = data
    .filter((f) => f.id) // folders come back with id: null
    .map((f) => ({
      path: f.name,
      url: `${publicUrlPrefix()}${f.name}`,
      bytes: f.metadata?.size ?? 0,
    }));

  return {
    totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
    fileCount: files.length,
    files,
  };
}
