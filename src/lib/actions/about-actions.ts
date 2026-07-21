"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { detectMediaKind } from "@/lib/constants";
import { clip } from "@/lib/validation";
import type { UploadTicket } from "@/lib/media-constants";
import { verifyUploadedAudioFile, isOwnAudioUrl } from "@/lib/storage";
import { createAnyMediaUploadTicket, isOwnAnyMediaUrl, deleteAnyMediaFile } from "@/lib/media-dispatch";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

function revalidateAbout() {
  revalidatePath("/about");
  revalidatePath("/admin/about");
}

/**
 * Admin-editable About page text (#59) — a flat, ordered list of title+body
 * blocks replacing what used to be hardcoded JSX. Append-only ordering (no
 * reorder UI), matching ExternalLink's own simplicity.
 */
export async function createAboutSection(formData: FormData) {
  await requireAdmin();

  const title = clip(String(formData.get("title") ?? "").trim(), "title");
  const body = clip(String(formData.get("body") ?? "").trim(), "content");
  if (!body) return;

  const count = await prisma.aboutPageSection.count();
  await prisma.aboutPageSection.create({
    data: { title: title || null, body, sortOrder: count },
  });

  revalidateAbout();
}

export async function updateAboutSection(id: string, title: string, body: string): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "Body text is required." };
  }

  await prisma.aboutPageSection.update({
    where: { id },
    data: { title: clip(title.trim(), "title") || null, body: clip(trimmedBody, "content") },
  });

  revalidateAbout();
  return {};
}

export async function deleteAboutSection(id: string) {
  await requireAdmin();
  await prisma.aboutPageSection.delete({ where: { id } });
  revalidateAbout();
}

/**
 * Mints a signed upload ticket for an About-page media Upload-tab file (#59),
 * routed to the audio or video bucket by its declared MIME type — the file
 * itself never reaches this action; only its metadata does, mirroring
 * song-actions.ts's own createMediaUploadTicket (#63).
 */
export async function createAboutMediaUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  return createAnyMediaUploadTicket(fileName, fileSize, mimeType);
}

/** Post-upload content check for a freshly uploaded audio file — see verifyUploadedAudioFile's own docs. */
export async function verifyAboutAudioUpload(url: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isOwnAudioUrl(url)) return {};
  return verifyUploadedAudioFile(url);
}

/**
 * Appends one media item (audio, video, or a pasted external link) to the
 * About page's flat media list (#59) — no per-voice-part grouping, unlike
 * addSongMedia, since the About page has no voice-part concept.
 */
export async function addAboutMedia(label: string, mediaUrl: string): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedLabel = label.trim();
  const trimmedUrl = mediaUrl.trim();
  if (!trimmedLabel || !trimmedUrl) {
    return { error: "Label and URL (or an uploaded file) are required." };
  }

  const count = await prisma.aboutPageMedia.count();
  await prisma.aboutPageMedia.create({
    data: {
      label: clip(trimmedLabel, "label"),
      mediaUrl: clip(trimmedUrl, "url"),
      mediaKind: detectMediaKind(trimmedUrl),
      sortOrder: count,
    },
  });

  revalidateAbout();
  return {};
}

export async function removeAboutMedia(id: string) {
  await requireAdmin();
  const media = await prisma.aboutPageMedia.delete({ where: { id } });
  if (isOwnAnyMediaUrl(media.mediaUrl)) {
    await deleteAnyMediaFile(media.mediaUrl);
  }
  revalidateAbout();
}
