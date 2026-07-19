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
  SONG_PART_LABEL_TEXT,
  LYRIC_SECTION_TYPES,
  VOICE_TAGS,
  type VoiceTag,
} from "@/lib/constants";
import { clip, oneOf, subsetOf } from "@/lib/validation";
import type { ParsedLyricSection } from "@/lib/lyrics-parser";

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
  const composer = clip(String(formData.get("composer") ?? "").trim(), "name");
  const lyricist = clip(String(formData.get("lyricist") ?? "").trim(), "name");

  if (!title) {
    throw new Error("Title is required.");
  }

  const song = await prisma.song.create({
    data: {
      title,
      composer: composer || null,
      lyricist: lyricist || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/songs");
  redirect(`/admin/songs/${song.id}/edit`);
}

export async function updateSongFull(
  songId: string,
  meta: { title: string; composer: string; lyricist: string },
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
        composer: clip(meta.composer.trim(), "name") || null,
        lyricist: clip(meta.lyricist.trim(), "name") || null,
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

  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
  return {};
}

export async function deleteSong(songId: string) {
  await requireAdmin();
  await prisma.song.delete({ where: { id: songId } });
  revalidatePath("/songs");
}

/**
 * Quick "Add Audio" entry point used by the Media page: appends one media
 * item to the (find-or-create) section for the given voice part, without
 * touching any other section — unlike updateSongFull, which replaces every
 * section wholesale.
 */
export async function addSongMedia(
  songId: string,
  part: string,
  label: string,
  mediaUrl: string
): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedLabel = label.trim();
  const trimmedUrl = mediaUrl.trim();
  if (!trimmedLabel || !trimmedUrl) {
    return { error: "Label and URL are required." };
  }

  const resolvedPart = oneOf(part, SONG_PART_OPTIONS, "All");

  let section = await prisma.songSection.findFirst({
    where: { songId, part: resolvedPart },
    orderBy: { sortOrder: "asc" },
  });

  if (!section) {
    const sectionCount = await prisma.songSection.count({ where: { songId } });
    section = await prisma.songSection.create({
      data: {
        songId,
        part: resolvedPart,
        sectionLabel: SONG_PART_LABEL_TEXT[resolvedPart],
        labelDescription: "",
        sortOrder: sectionCount,
      },
    });
  }

  const mediaCount = await prisma.songMedia.count({ where: { sectionId: section.id } });
  await prisma.songMedia.create({
    data: {
      sectionId: section.id,
      label: clip(trimmedLabel, "label"),
      mediaUrl: clip(trimmedUrl, "url"),
      mediaKind: detectMediaKind(trimmedUrl),
      sortOrder: mediaCount,
    },
  });

  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/media`);
  return {};
}

export async function removeSongMedia(songId: string, mediaId: string) {
  await requireAdmin();
  await prisma.songMedia.delete({ where: { id: mediaId } });
  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/media`);
}

/**
 * Replaces all of a song's lyrics from a parsed paste, without touching its
 * voice-part sections/media — the standalone counterpart of the lyrics half
 * of updateSongFull, used by the Replace Lyrics page.
 */
export async function replaceLyrics(
  songId: string,
  sections: ParsedLyricSection[]
): Promise<{ error?: string }> {
  await requireAdmin();

  const cleaned = sections.filter((s) => s.content.trim());
  if (cleaned.length === 0) {
    return { error: "Paste some lyrics before saving." };
  }

  await prisma.$transaction([
    prisma.lyricSection.deleteMany({ where: { songId } }),
    prisma.lyricSection.createMany({
      data: cleaned.map((s, i) => ({
        songId,
        sectionType: oneOf(s.sectionType, LYRIC_SECTION_TYPES, "custom"),
        sectionLabel: clip(s.sectionLabel.trim() || s.sectionType, "label"),
        content: clip(s.content.trim(), "content"),
        voiceTags: serializeVoiceTags(subsetOf(s.voiceTags, VOICE_TAGS)),
        sortOrder: i,
      })),
    }),
  ]);

  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/lyrics`);
  return {};
}
