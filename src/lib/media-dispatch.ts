import type { UploadTicket } from "@/lib/media-constants";
import { createAudioUploadTicket, deleteAudioFile, isOwnAudioUrl } from "@/lib/storage";
import { createVideoUploadTicket, deleteVideoFile, isOwnVideoUrl } from "@/lib/video-storage";

/**
 * Shared audio/video Storage dispatch (#59) — factored out of what was
 * originally `song-actions.ts`-only logic once the About page (#59) needed
 * the exact same routing for its own, unrelated media items.
 */

/** Mints a signed upload ticket, routed to the audio or video bucket by MIME type. */
export async function createAnyMediaUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  return mimeType.startsWith("video/")
    ? createVideoUploadTicket(fileName, fileSize, mimeType)
    : createAudioUploadTicket(fileName, fileSize, mimeType);
}

/** True if this URL was produced by either of our own upload buckets. */
export function isOwnAnyMediaUrl(url: string): boolean {
  return isOwnAudioUrl(url) || isOwnVideoUrl(url);
}

/** No-op if the URL isn't one of ours — routes to whichever bucket actually owns it. */
export async function deleteAnyMediaFile(url: string): Promise<void> {
  if (isOwnAudioUrl(url)) return deleteAudioFile(url);
  if (isOwnVideoUrl(url)) return deleteVideoFile(url);
}
