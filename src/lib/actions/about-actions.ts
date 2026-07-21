"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import type { UploadTicket } from "@/lib/media-constants";
import { createVideoUploadTicket, deleteVideoFile, isOwnVideoUrl } from "@/lib/video-storage";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

/**
 * Mints a signed upload ticket for the About page's featured video (#63) —
 * the file itself never reaches this action; only its metadata does, so
 * this call can never hit Vercel's 4.5MB Function body limit the way
 * sending the actual file would.
 */
export async function createAboutVideoUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  return createVideoUploadTicket(fileName, fileSize, mimeType);
}

/**
 * Replaces the public About page's single featured video (#55) — a
 * singleton row (fixed id "about"), so this always upserts rather than
 * creating a new row per upload. Cleans up the previous file from Storage
 * once the new one is safely recorded.
 */
export async function updateAboutVideo(videoUrl: string): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedUrl = videoUrl.trim();
  if (!trimmedUrl) {
    return { error: "A video file is required." };
  }

  const previous = await prisma.aboutPageVideo.findUnique({ where: { id: "about" } });

  await prisma.aboutPageVideo.upsert({
    where: { id: "about" },
    create: { id: "about", videoUrl: trimmedUrl },
    update: { videoUrl: trimmedUrl },
  });

  if (previous && isOwnVideoUrl(previous.videoUrl)) {
    await deleteVideoFile(previous.videoUrl);
  }

  revalidatePath("/about");
  return {};
}

export async function removeAboutVideo(): Promise<void> {
  await requireAdmin();

  const existing = await prisma.aboutPageVideo.findUnique({ where: { id: "about" } });
  if (!existing) return;

  await prisma.aboutPageVideo.delete({ where: { id: "about" } });
  if (isOwnVideoUrl(existing.videoUrl)) {
    await deleteVideoFile(existing.videoUrl);
  }

  revalidatePath("/about");
}
