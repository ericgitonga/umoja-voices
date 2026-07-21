"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { uploadVideoFile, deleteVideoFile, isOwnVideoUrl } from "@/lib/video-storage";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

/**
 * Replaces the public About page's single featured video (#55) — a
 * singleton row (fixed id "about"), so this always upserts rather than
 * creating a new row per upload. Cleans up the previous file from Storage
 * once the new one is safely recorded.
 */
export async function updateAboutVideo(file: File): Promise<{ error?: string }> {
  await requireAdmin();

  if (!file || file.size === 0) {
    return { error: "A video file is required." };
  }

  const result = await uploadVideoFile(file);
  if (result.error) return { error: result.error };

  const previous = await prisma.aboutPageVideo.findUnique({ where: { id: "about" } });

  await prisma.aboutPageVideo.upsert({
    where: { id: "about" },
    create: { id: "about", videoUrl: result.url! },
    update: { videoUrl: result.url! },
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
