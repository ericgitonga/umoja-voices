"use client";

import { createClient } from "@/lib/supabase/client";
import { describeUploadFailure } from "@/lib/upload-error";
import type { UploadTicket } from "@/lib/media-constants";

/**
 * Uploads a file directly from the browser to Supabase Storage using a
 * signed ticket minted server-side (#63) — Vercel Functions reject any
 * request body over 4.5MB, so the file itself can never ride through a
 * Server Action. `uploadToSignedUrl` needs no RLS policy to use (the token
 * is the auth mechanism), so the anon/publishable browser client is enough.
 *
 * Mirrors the two-tier error convention every upload form already used for
 * its single Server Action call: a returned `{error}` for a handled Storage
 * failure, `describeUploadFailure(err)` for a thrown/network failure.
 */
export async function uploadFileDirectly(ticket: UploadTicket, file: File): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });

    if (error) {
      // TEMPORARY diagnostic: surfacing the raw Storage error to find out
      // why direct browser uploads are failing in CI. Revert to the plain
      // "Upload failed — please try again." once root-caused.
      return { error: `Upload failed (direct): ${error.message}` };
    }

    return { url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ticket.bucket}/${ticket.path}` };
  } catch (err) {
    return { error: describeUploadFailure(err) };
  }
}
