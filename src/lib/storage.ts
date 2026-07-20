import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIO_MAX_BYTES, AUDIO_ALLOWED_EXTENSIONS, AUDIO_ALLOWED_MIME_TYPES } from "@/lib/media-constants";

/**
 * Direct audio-file uploads to Supabase Storage (#36). Video stays link-only
 * by explicit choice — this module only ever handles the "song-audio" bucket.
 * Never import this from a client component (pulls in the admin client).
 */

export const AUDIO_BUCKET = "song-audio";
export { AUDIO_MAX_BYTES };

function publicUrlPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AUDIO_BUCKET}/`;
}

/** True if this URL points at our own bucket, i.e. we can delete the underlying object. */
export function isOwnAudioUrl(url: string): boolean {
  return url.startsWith(publicUrlPrefix());
}

function storagePathFromUrl(url: string): string | null {
  const prefix = publicUrlPrefix();
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/**
 * Validates and uploads an audio file via the admin/service-role client —
 * consistent with this app's pattern of never talking to Storage from the
 * client and not relying on Storage RLS policies.
 */
export async function uploadAudioFile(file: File): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("audio/")) {
    return { error: "File must be an audio file." };
  }
  if (!AUDIO_ALLOWED_MIME_TYPES.includes(file.type as (typeof AUDIO_ALLOWED_MIME_TYPES)[number])) {
    return { error: "Unsupported audio format — use MP3, WAV, M4A, or OGG." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !AUDIO_ALLOWED_EXTENSIONS.includes(ext as (typeof AUDIO_ALLOWED_EXTENSIONS)[number])) {
    return { error: "Unsupported file extension — use .mp3, .wav, .m4a, or .ogg." };
  }

  if (file.size > AUDIO_MAX_BYTES) {
    return { error: `File is too large — max ${AUDIO_MAX_BYTES / (1024 * 1024)}MB.` };
  }

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) {
    return { error: "Upload failed — please try again." };
  }

  return { url: `${publicUrlPrefix()}${path}` };
}

/** No-op if the URL isn't one of ours (e.g. a pasted link) — nothing to clean up. */
export async function deleteAudioFile(url: string): Promise<void> {
  const path = storagePathFromUrl(url);
  if (!path) return;

  const supabase = createAdminClient();
  await supabase.storage.from(AUDIO_BUCKET).remove([path]);
}

export type AudioStorageUsage = {
  totalBytes: number;
  fileCount: number;
  files: { path: string; url: string; bytes: number }[];
};

/** Live usage snapshot for the admin Storage page — no caching, no schema. */
export async function getAudioStorageUsage(): Promise<AudioStorageUsage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).list("", {
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
