// One-off setup: creates the "song-audio" Supabase Storage bucket used by
// direct audio-file uploads (#36). Safe to re-run — no-ops if it exists.
//
// Usage: tsx scripts/create-storage-bucket.ts (via `npm run storage:setup`)

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import { AUDIO_BUCKET } from "../src/lib/storage";
import { AUDIO_MAX_BYTES, AUDIO_ALLOWED_MIME_TYPES } from "../src/lib/media-constants";

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

  if (buckets.some((b) => b.name === AUDIO_BUCKET)) {
    console.log(`Bucket "${AUDIO_BUCKET}" already exists — nothing to do.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(AUDIO_BUCKET, {
    public: true,
    fileSizeLimit: AUDIO_MAX_BYTES,
    allowedMimeTypes: [...AUDIO_ALLOWED_MIME_TYPES],
  });
  if (error) throw error;

  console.log(`Created bucket "${AUDIO_BUCKET}" (public, ${AUDIO_MAX_BYTES / (1024 * 1024)}MB/file limit).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
