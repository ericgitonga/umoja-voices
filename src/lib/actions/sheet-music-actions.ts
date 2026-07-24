"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { clip } from "@/lib/validation";
import type { UploadTicket } from "@/lib/media-constants";
import {
  createSheetMusicUploadTicket as mintSheetMusicUploadTicket,
  deleteSheetMusicFile,
  isOwnSheetMusicUrl,
} from "@/lib/sheet-music-storage";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

/**
 * Mints a signed upload ticket for a sheet-music PDF (#63) — the file itself
 * never reaches this action; only its metadata does, so this call can never
 * hit Vercel's 4.5MB Function body limit the way sending the actual file
 * would.
 */
export async function createSheetMusicUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  return mintSheetMusicUploadTicket(fileName, fileSize, mimeType);
}

export async function addSheetMusic(
  songId: string,
  label: string,
  fileUrl: string
): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedLabel = label.trim();
  const trimmedUrl = fileUrl.trim();
  if (!trimmedLabel || !trimmedUrl) {
    return { error: "Label and a PDF file are required." };
  }

  const sortOrder = await prisma.songSheetMusic.count({ where: { songId } });
  await prisma.songSheetMusic.create({
    data: {
      songId,
      label: clip(trimmedLabel, "label"),
      fileUrl: clip(trimmedUrl, "url"),
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
