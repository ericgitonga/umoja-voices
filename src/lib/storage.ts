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

type SniffedAudioFormat = "mp3" | "wav" | "mp4" | "ogg" | "unknown";

// What container/frame format each allowed extension is expected to actually
// contain. "m4a" is itself an MP4/ISO-BMFF container, so it maps to "mp4" —
// this is what lets a genuine .m4a through while still catching a renamed
// AAC/MP4 stream masquerading as .mp3 (the exact shape of a YouTube-style
// DASH audio download saved with the wrong extension, see #38 follow-up).
const EXTENSION_EXPECTED_FORMAT: Record<string, SniffedAudioFormat> = {
  mp3: "mp3",
  wav: "wav",
  m4a: "mp4",
  ogg: "ogg",
};

/**
 * Identifies the actual container/frame format from the file's own leading
 * bytes — a browser's reported `File.type` for a local file is derived from
 * its extension, not its content, so it can't be trusted to catch a
 * mislabeled file (see the .mp3-that's-really-AAC/MP4 case this guards
 * against). 12 bytes is enough to identify every format below.
 */
async function sniffAudioFormat(file: File): Promise<SniffedAudioFormat> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...head.slice(start, start + len));

  if (ascii(0, 3) === "ID3") return "mp3";
  // MPEG frame sync: 11 set bits (0xFF followed by the top 3 bits of the next byte).
  if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return "mp3";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "wav";
  if (ascii(4, 4) === "ftyp") return "mp4";
  if (ascii(0, 4) === "OggS") return "ogg";
  return "unknown";
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

  const sniffed = await sniffAudioFormat(file);
  const expected = EXTENSION_EXPECTED_FORMAT[ext];
  if (sniffed !== expected) {
    return {
      error:
        ext === "mp3" && sniffed === "mp4"
          ? "This file's actual content is AAC/MP4 audio, not MP3 — common with files downloaded from YouTube without converting them. Re-export it as a real MP3 (e.g. via Audacity) and upload that instead."
          : `This file's content doesn't look like a real .${ext} file — it may be mislabeled or corrupted.`,
    };
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
