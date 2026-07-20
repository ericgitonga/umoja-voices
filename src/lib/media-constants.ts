// Client-safe constants for direct audio-file uploads (#36) — no Supabase
// client import here, so this is safe to pull into client components.
// Server-side upload/delete logic lives in src/lib/storage.ts.

// Below Supabase's hard 50MB-per-file limit — a starting number, not a
// researched constraint, fine to raise later if a real recording needs more.
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;

// Mirrors detectMediaKind's audio regex (src/lib/constants.ts) so an upload
// can only ever produce a URL that constants.ts will also classify "audio".
export const AUDIO_ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a", "ogg"] as const;

export const AUDIO_ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
] as const;

export const AUDIO_ACCEPT = [...AUDIO_ALLOWED_EXTENSIONS.map((e) => `.${e}`), "audio/*"].join(",");

// Client-safe constants for direct PDF sheet-music uploads (#38). Server-side
// upload/delete logic lives in src/lib/sheet-music-storage.ts.
export const SHEET_MUSIC_MAX_BYTES = 20 * 1024 * 1024;
export const SHEET_MUSIC_ALLOWED_EXTENSIONS = ["pdf"] as const;
export const SHEET_MUSIC_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const SHEET_MUSIC_ACCEPT = [...SHEET_MUSIC_ALLOWED_EXTENSIONS.map((e) => `.${e}`), "application/pdf"].join(",");
