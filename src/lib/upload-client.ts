"use client";

import { describeUploadFailure } from "@/lib/upload-error";
import type { UploadTicket } from "@/lib/media-constants";

/**
 * Uploads a file directly from the browser to Supabase Storage using a
 * signed ticket minted server-side (#63) — Vercel Functions reject any
 * request body over 4.5MB, so the file itself can never ride through a
 * Server Action. `token` needs no RLS policy to use (it's the auth
 * mechanism), so no Supabase client/session is needed here.
 *
 * Uses a raw XMLHttpRequest against the same signed-upload endpoint the
 * Supabase SDK's own `uploadToSignedUrl()` calls internally, rather than
 * that SDK method itself (#66) — `fetch` has no upload-progress event, so a
 * real circular progress tracker needs XHR's `upload.onprogress` instead.
 * Request shape (URL, FormData fields, headers) is copied from
 * `@supabase/storage-js`'s own implementation (`node_modules/@supabase/
 * storage-js`) to avoid silently diverging from a working upload path: PUT
 * to `/object/upload/sign/<bucket>/<path>?token=<token>`, a FormData body
 * with a `cacheControl` field plus the file under an empty-string field
 * name (the browser sets that part's Content-Type from the File's own
 * `.type` automatically — matches what the SDK does for a File/Blob body,
 * which is why the old code's `contentType` option was actually a no-op).
 *
 * Mirrors the two-tier error convention every upload form already used for
 * its single Server Action call: a returned `{error}` for a handled Storage
 * failure, `describeUploadFailure(err)` for a thrown/network failure.
 */
export function uploadFileDirectly(
  ticket: UploadTicket,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<{ url?: string; error?: string }> {
  return new Promise((resolve) => {
    const url = new URL(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${ticket.bucket}/${ticket.path}`
    );
    url.searchParams.set("token", ticket.token);

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url.toString());
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ticket.bucket}/${ticket.path}` });
      } else {
        resolve({ error: "Upload failed — please try again." });
      }
    };
    // XHR's error/timeout/abort events carry no message text (unlike a
    // rejected fetch promise) -- synthesize one describeUploadFailure
    // already recognizes as network-caused, so the same actionable copy
    // (#58) still shows instead of falling through to the generic message.
    xhr.onerror = () => resolve({ error: describeUploadFailure(new Error("Failed to fetch")) });
    xhr.ontimeout = () => resolve({ error: describeUploadFailure(new Error("Failed to fetch")) });
    xhr.onabort = () => resolve({ error: describeUploadFailure(new Error("Failed to fetch")) });

    xhr.send(body);
  });
}
