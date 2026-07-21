import { createAdminClient } from "@/lib/supabase/admin";
import {
  VIDEO_MAX_BYTES,
  VIDEO_ALLOWED_EXTENSIONS,
  VIDEO_ALLOWED_MIME_TYPES,
  type UploadTicket,
} from "@/lib/media-constants";

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
 * Validates the declared file metadata and mints a signed upload URL so the
 * browser can upload directly to Storage (#63) — Vercel Functions reject any
 * request body over 4.5MB, so the file itself can never ride through a
 * Server Action; only this small ticket-minting call does. `createAdminClient()`
 * bypasses RLS to mint the ticket, but the ticket itself needs none to use
 * (see uploadToSignedUrl's own docs) — never import this from a client
 * component (pulls in the admin client).
 */
export async function createVideoUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  if (!mimeType.startsWith("video/")) {
    return { error: "File must be a video file." };
  }
  if (!VIDEO_ALLOWED_MIME_TYPES.includes(mimeType as (typeof VIDEO_ALLOWED_MIME_TYPES)[number])) {
    return { error: "Unsupported video format — use MP4, MOV, or WEBM." };
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !VIDEO_ALLOWED_EXTENSIONS.includes(ext as (typeof VIDEO_ALLOWED_EXTENSIONS)[number])) {
    return { error: "Unsupported file extension — use .mp4, .mov, or .webm." };
  }

  if (fileSize > VIDEO_MAX_BYTES) {
    return { error: `File is too large — max ${VIDEO_MAX_BYTES / (1024 * 1024)}MB.` };
  }

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    // TEMPORARY diagnostic — revert to the plain message once root-caused.
    return { error: `Upload failed (mint): ${error?.message ?? "no data"}` };
  }

  return { bucket: VIDEO_BUCKET, path: data.path, token: data.token };
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
