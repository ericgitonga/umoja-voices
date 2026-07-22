// One-off setup: creates the Supabase Storage buckets used by direct file
// uploads — "song-audio" (#36), "song-sheet-music" (#38), "song-video"
// (#55), and "profile-photos" (#73). Safe to re-run — no-ops per bucket if
// it already exists.
//
// Usage: tsx scripts/create-storage-bucket.ts (via `npm run storage:setup`)

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import { AUDIO_BUCKET } from "../src/lib/storage";
import { SHEET_MUSIC_BUCKET } from "../src/lib/sheet-music-storage";
import { VIDEO_BUCKET } from "../src/lib/video-storage";
import { PROFILE_PHOTO_BUCKET } from "../src/lib/profile-photo-storage";
import {
  AUDIO_MAX_BYTES,
  AUDIO_ALLOWED_MIME_TYPES,
  SHEET_MUSIC_MAX_BYTES,
  SHEET_MUSIC_ALLOWED_MIME_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_ALLOWED_MIME_TYPES,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_ALLOWED_MIME_TYPES,
} from "../src/lib/media-constants";

const BUCKETS = [
  { name: AUDIO_BUCKET, maxBytes: AUDIO_MAX_BYTES, allowedMimeTypes: AUDIO_ALLOWED_MIME_TYPES },
  { name: SHEET_MUSIC_BUCKET, maxBytes: SHEET_MUSIC_MAX_BYTES, allowedMimeTypes: SHEET_MUSIC_ALLOWED_MIME_TYPES },
  { name: VIDEO_BUCKET, maxBytes: VIDEO_MAX_BYTES, allowedMimeTypes: VIDEO_ALLOWED_MIME_TYPES },
  { name: PROFILE_PHOTO_BUCKET, maxBytes: PROFILE_PHOTO_MAX_BYTES, allowedMimeTypes: PROFILE_PHOTO_ALLOWED_MIME_TYPES },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set — see .env.example.");
  }

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  const existing = new Set(buckets.map((b) => b.name));

  for (const bucket of BUCKETS) {
    if (existing.has(bucket.name)) {
      console.log(`Bucket "${bucket.name}" already exists — nothing to do.`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: true,
      fileSizeLimit: bucket.maxBytes,
      allowedMimeTypes: [...bucket.allowedMimeTypes],
    });
    if (error) throw error;

    console.log(`Created bucket "${bucket.name}" (public, ${bucket.maxBytes / (1024 * 1024)}MB/file limit).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
