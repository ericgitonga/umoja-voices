"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectMediaKind, serializeVoiceTags, type VoiceTag } from "@/lib/constants";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

export type PartInput = {
  part: string;
  label: string;
  mediaUrl: string;
};

export type LyricSectionInput = {
  sectionType: string;
  sectionLabel: string;
  content: string;
  voiceTags: VoiceTag[];
};

export async function createSong(formData: FormData) {
  const session = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const sectionLabel = String(formData.get("sectionLabel") ?? "SATB_COMPULSORY");
  const labelDescription = String(formData.get("labelDescription") ?? "").trim();

  if (!title || !labelDescription) {
    throw new Error("Title and label description are required.");
  }

  const song = await prisma.song.create({
    data: { title, sectionLabel, labelDescription, createdById: session.user.id },
  });

  revalidatePath("/admin/songs");
  redirect(`/admin/songs/${song.id}/edit`);
}

export async function updateSongFull(
  songId: string,
  meta: { title: string; sectionLabel: string; labelDescription: string },
  parts: PartInput[],
  lyricSections: LyricSectionInput[]
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!meta.title.trim() || !meta.labelDescription.trim()) {
    return { error: "Title and label description are required." };
  }

  await prisma.$transaction([
    prisma.song.update({
      where: { id: songId },
      data: {
        title: meta.title.trim(),
        sectionLabel: meta.sectionLabel,
        labelDescription: meta.labelDescription.trim(),
      },
    }),
    prisma.songPart.deleteMany({ where: { songId } }),
    prisma.songPart.createMany({
      data: parts
        .filter((p) => p.mediaUrl.trim())
        .map((p, i) => ({
          songId,
          part: p.part,
          label: p.label.trim() || p.part,
          mediaUrl: p.mediaUrl.trim(),
          mediaKind: detectMediaKind(p.mediaUrl.trim()),
          sortOrder: i,
        })),
    }),
    prisma.lyricSection.deleteMany({ where: { songId } }),
    prisma.lyricSection.createMany({
      data: lyricSections
        .filter((s) => s.content.trim())
        .map((s, i) => ({
          songId,
          sectionType: s.sectionType,
          sectionLabel: s.sectionLabel.trim() || s.sectionType,
          content: s.content.trim(),
          voiceTags: serializeVoiceTags(s.voiceTags),
          sortOrder: i,
        })),
    }),
  ]);

  revalidatePath("/admin/songs");
  revalidatePath(`/songs/${songId}`);
  return {};
}

export async function deleteSong(songId: string) {
  await requireAdmin();
  await prisma.song.delete({ where: { id: songId } });
  revalidatePath("/admin/songs");
}
