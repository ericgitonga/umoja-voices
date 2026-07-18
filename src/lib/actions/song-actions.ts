"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detectMediaKind,
  serializeVoiceTags,
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

export type MediaInput = {
  label: string;
  mediaUrl: string;
};

export type SectionInput = {
  part: string;
  sectionLabel: string;
  labelDescription: string;
  media: MediaInput[];
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

  if (!title) {
    throw new Error("Title is required.");
  }

  const song = await prisma.song.create({
    data: { title, createdById: session.user.id },
  });

  revalidatePath("/admin/songs");
  redirect(`/admin/songs/${song.id}/edit`);
}

export async function updateSongFull(
  songId: string,
  meta: { title: string },
  sections: SectionInput[],
  lyricSections: LyricSectionInput[]
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!meta.title.trim()) {
    return { error: "Title is required." };
  }

  await prisma.$transaction([
    prisma.song.update({
      where: { id: songId },
      data: {
        title: clip(meta.title.trim(), "title"),
      },
    }),
    prisma.songSection.deleteMany({ where: { songId } }),
    ...sections
      .filter((s) => s.media.some((m) => m.mediaUrl.trim()))
      .map((s, i) =>
        prisma.songSection.create({
          data: {
            songId,
            part: oneOf(s.part, SONG_PART_OPTIONS, "All"),
            sectionLabel: clip(s.sectionLabel.trim() || s.part, "label"),
            labelDescription: clip(s.labelDescription.trim(), "description"),
            sortOrder: i,
            media: {
              create: s.media
                .filter((m) => m.mediaUrl.trim())
                .map((m, j) => ({
                  label: clip(m.label.trim() || s.sectionLabel.trim() || s.part, "label"),
                  mediaUrl: clip(m.mediaUrl.trim(), "url"),
                  mediaKind: detectMediaKind(m.mediaUrl.trim()),
                  sortOrder: j,
                })),
            },
          },
        })
      ),
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
