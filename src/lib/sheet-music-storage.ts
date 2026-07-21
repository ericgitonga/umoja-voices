import { createAdminClient } from "@/lib/supabase/admin";
import {
  SHEET_MUSIC_MAX_BYTES,
  SHEET_MUSIC_ALLOWED_EXTENSIONS,
  SHEET_MUSIC_ALLOWED_MIME_TYPES,
  type UploadTicket,
} from "@/lib/media-constants";

/**
 * Direct PDF sheet-music uploads to Supabase Storage (#38) — a separate
 * bucket from song-audio (src/lib/storage.ts) since it's a distinct file
 * type with its own quota accounting. Never import this from a client
 * component (pulls in the admin client).
 */

export const SHEET_MUSIC_BUCKET = "song-sheet-music";
export { SHEET_MUSIC_MAX_BYTES };

function publicUrlPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SHEET_MUSIC_BUCKET}/`;
}

/** True if this URL points at our own bucket, i.e. we can delete the underlying object. */
export function isOwnSheetMusicUrl(url: string): boolean {
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
export async function createSheetMusicUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  if (mimeType !== "application/pdf") {
    return { error: "File must be a PDF." };
  }
  if (!SHEET_MUSIC_ALLOWED_MIME_TYPES.includes(mimeType as (typeof SHEET_MUSIC_ALLOWED_MIME_TYPES)[number])) {
    return { error: "Unsupported file type — use PDF." };
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !SHEET_MUSIC_ALLOWED_EXTENSIONS.includes(ext as (typeof SHEET_MUSIC_ALLOWED_EXTENSIONS)[number])) {
    return { error: "Unsupported file extension — use .pdf." };
  }

  if (fileSize > SHEET_MUSIC_MAX_BYTES) {
    return { error: `File is too large — max ${SHEET_MUSIC_MAX_BYTES / (1024 * 1024)}MB.` };
  }

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(SHEET_MUSIC_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return { error: "Upload failed — please try again." };
  }

  return { bucket: SHEET_MUSIC_BUCKET, path: data.path, token: data.token };
}

/** No-op if the URL isn't one of ours — nothing to clean up. */
export async function deleteSheetMusicFile(url: string): Promise<void> {
  const path = storagePathFromUrl(url);
  if (!path) return;

  const supabase = createAdminClient();
  await supabase.storage.from(SHEET_MUSIC_BUCKET).remove([path]);
}

export type SheetMusicStorageUsage = {
  totalBytes: number;
  fileCount: number;
  files: { path: string; url: string; bytes: number }[];
};

/** Live usage snapshot for the admin Storage page — no caching, no schema. */
export async function getSheetMusicStorageUsage(): Promise<SheetMusicStorageUsage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(SHEET_MUSIC_BUCKET).list("", {
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
