"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detectMediaKind,
  serializeVoiceTags,
  SONG_SECTION_LABELS,
  SONG_PART_OPTIONS,
  LYRIC_SECTION_TYPES,
  VOICE_TAGS,
  type VoiceTag,
} from "@/lib/constants";
import { clip, oneOf, subsetOf } from "@/lib/validation";

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

  const title = clip(String(formData.get("title") ?? "").trim(), "title");
  const sectionLabel = oneOf(String(formData.get("sectionLabel") ?? ""), SONG_SECTION_LABELS, "SATB_COMPULSORY");
  const labelDescription = clip(String(formData.get("labelDescription") ?? "").trim(), "description");

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
        title: clip(meta.title.trim(), "title"),
        sectionLabel: oneOf(meta.sectionLabel, SONG_SECTION_LABELS, "SATB_COMPULSORY"),
        labelDescription: clip(meta.labelDescription.trim(), "description"),
      },
    }),
    prisma.songPart.deleteMany({ where: { songId } }),
    prisma.songPart.createMany({
      data: parts
        .filter((p) => p.mediaUrl.trim())
        .map((p, i) => ({
          songId,
          part: oneOf(p.part, SONG_PART_OPTIONS, "All"),
          label: clip(p.label.trim() || p.part, "label"),
          mediaUrl: clip(p.mediaUrl.trim(), "url"),
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
          sectionType: oneOf(s.sectionType, LYRIC_SECTION_TYPES, "custom"),
          sectionLabel: clip(s.sectionLabel.trim() || s.sectionType, "label"),
          content: clip(s.content.trim(), "content"),
          voiceTags: serializeVoiceTags(subsetOf(s.voiceTags, VOICE_TAGS)),
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
