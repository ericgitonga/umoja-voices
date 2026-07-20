"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { clip } from "@/lib/validation";
import { uploadSheetMusicFile, deleteSheetMusicFile, isOwnSheetMusicUrl } from "@/lib/sheet-music-storage";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

export async function addSheetMusic(
  songId: string,
  label: string,
  file: File
): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedLabel = label.trim();
  if (!trimmedLabel || !file || file.size === 0) {
    return { error: "Label and a PDF file are required." };
  }

  const result = await uploadSheetMusicFile(file);
  if (result.error) return { error: result.error };

  const sortOrder = await prisma.songSheetMusic.count({ where: { songId } });
  await prisma.songSheetMusic.create({
    data: {
      songId,
      label: clip(trimmedLabel, "label"),
      fileUrl: result.url!,
      sortOrder,
    },
  });

  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/sheet-music`);
  return {};
}

export async function removeSheetMusic(songId: string, id: string) {
  await requireAdmin();
  const sheetMusic = await prisma.songSheetMusic.delete({ where: { id } });
  if (isOwnSheetMusicUrl(sheetMusic.fileUrl)) {
    await deleteSheetMusicFile(sheetMusic.fileUrl);
  }
  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/sheet-music`);
}
