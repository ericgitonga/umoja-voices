// Returned by each storage module's createXUploadTicket() (#63) — mints a
// Supabase signed upload URL server-side so the client can upload directly
// to Storage, bypassing Vercel's 4.5MB Function body limit. `token` needs no
// RLS policy to use (see uploadToSignedUrl's own docs); `bucket` is included
// so client code never needs to hardcode bucket names.
export type UploadTicket = { bucket: string; path: string; token: string };

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

// Client-safe constants for direct video-file uploads (#55). Server-side
// upload/delete logic lives in src/lib/video-storage.ts. Mirrors
// detectMediaKind's video regex (src/lib/constants.ts) so an upload can only
// ever produce a URL that constants.ts will also classify "video". All
// featured videos are under 20MB by app-owner convention (larger ones get
// ffmpeg-compressed before upload), matching the existing audio/sheet-music
// cap and the Server Actions body-size limit already raised for #36.
export const VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const VIDEO_ALLOWED_EXTENSIONS = ["mp4", "mov", "webm"] as const;
export const VIDEO_ALLOWED_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const VIDEO_ACCEPT = [...VIDEO_ALLOWED_EXTENSIONS.map((e) => `.${e}`), "video/*"].join(",");

// Client-safe constants for profile-photo uploads (#73). Server-side
// upload/delete logic lives in src/lib/profile-photo-storage.ts. Deliberately
// smaller than the 20MB media cap above -- a profile photo is a single
// avatar image, not a recording or PDF. A starting number, not a researched
// constraint (same caveat as AUDIO_MAX_BYTES), fine to raise later.
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const PROFILE_PHOTO_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_PHOTO_ACCEPT = [...PROFILE_PHOTO_ALLOWED_EXTENSIONS.map((e) => `.${e}`), "image/*"].join(",");
