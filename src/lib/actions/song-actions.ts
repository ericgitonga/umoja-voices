"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
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
import type { UploadTicket } from "@/lib/media-constants";
import { verifyUploadedAudioFile, isOwnAudioUrl } from "@/lib/storage";
import { createAnyMediaUploadTicket, isOwnAnyMediaUrl, deleteAnyMediaFile } from "@/lib/media-dispatch";
import { logActivity } from "@/lib/activity-log";

/**
 * Mints a signed upload ticket for an Upload-tab file, routed to the audio
 * or video bucket by its declared MIME type (#63) — the file itself never
 * reaches this action; only its metadata does, so this call can never hit
 * Vercel's 4.5MB Function body limit the way sending the actual file would.
 */
export async function createMediaUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  return createAnyMediaUploadTicket(fileName, fileSize, mimeType);
}

/**
 * Post-upload content check for a freshly uploaded audio file (#63) — see
 * verifyUploadedAudioFile's own docs. No-ops for a video URL or a pasted
 * external link (isOwnAudioUrl is false for both).
 */
export async function verifyAudioUpload(url: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isOwnAudioUrl(url)) return {};
  return verifyUploadedAudioFile(url);
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

export type MediaInput = {
  label: string;
  // Always a final Storage/pasted URL by the time this reaches the server
  // (#63) — an Upload-tab file is resolved to its Storage URL client-side,
  // via createMediaUploadTicket + a direct browser upload, before submission.
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

/**
 * New Song (#80): creates the Song plus its voice-part sections/media and
 * lyric sections in one transaction, so nothing lands in the DB until the
 * admin actually clicks Create song -- no more intermediate "song exists
 * but has nothing in it yet" state to abandon or clean up (that's what
 * #78's now-removed draft/Cancel-deletes-it mechanism was working around).
 */
export async function createSongFull(
  meta: { title: string; composer: string; lyricist: string; arranger: string },
  sections: SectionInput[],
  lyricSections: LyricSectionInput[]
): Promise<{ error?: string; songId?: string }> {
  const session = await requireAdmin();

  if (!meta.title.trim()) {
    return { error: "Title is required." };
  }

  const song = await prisma.$transaction(async (tx) => {
    const created = await tx.song.create({
      data: {
        title: clip(meta.title.trim(), "title"),
        composer: clip(meta.composer.trim(), "name") || null,
        lyricist: clip(meta.lyricist.trim(), "name") || null,
        arranger: clip(meta.arranger.trim(), "name") || null,
        createdById: session.user.id,
      },
    });

    for (const [i, s] of sections.filter((s) => s.media.some((m) => m.mediaUrl.trim())).entries()) {
      await tx.songSection.create({
        data: {
          songId: created.id,
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
      });
    }

    await tx.lyricSection.createMany({
      data: lyricSections
        .filter((s) => s.content.trim())
        .map((s, i) => ({
          songId: created.id,
          sectionType: oneOf(s.sectionType, LYRIC_SECTION_TYPES, "custom"),
          sectionLabel: clip(s.sectionLabel.trim() || s.sectionType, "label"),
          content: clip(s.content.trim(), "content"),
          voiceTags: serializeVoiceTags(subsetOf(s.voiceTags, VOICE_TAGS)),
          sortOrder: i,
        })),
    });

    return created;
  });

  await logActivity(`${session.user.name} <${session.user.email}>`, "song_create", song.title, {
    type: "Song",
    label: song.title,
  });

  revalidatePath("/songs");
  return { songId: song.id };
}

export async function updateSongFull(
  songId: string,
  meta: { title: string; composer: string; lyricist: string; arranger: string },
  sections: SectionInput[],
  lyricSections: LyricSectionInput[]
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  if (!meta.title.trim()) {
    return { error: "Title is required." };
  }

  // Any Upload-tab entry has already been resolved to a Storage URL
  // client-side by this point (#63) — a failed upload aborts the save there,
  // before this action is even called, so every m.mediaUrl below is final.
  const keptUrls = new Set(sections.flatMap((s) => s.media.map((m) => m.mediaUrl.trim())).filter(Boolean));
  const existingMedia = await prisma.songMedia.findMany({
    where: { section: { songId } },
    select: { mediaUrl: true },
  });
  // Sections/media are wholesale-replaced below, so an uploaded file whose
  // row doesn't survive the replace would otherwise silently keep eating
  // into the 1GB Storage budget forever.
  const orphanedUrls = existingMedia
    .map((m) => m.mediaUrl)
    .filter((url) => isOwnAnyMediaUrl(url) && !keptUrls.has(url));

  await prisma.$transaction([
    prisma.song.update({
      where: { id: songId },
      data: {
        title: clip(meta.title.trim(), "title"),
        composer: clip(meta.composer.trim(), "name") || null,
        lyricist: clip(meta.lyricist.trim(), "name") || null,
        arranger: clip(meta.arranger.trim(), "name") || null,
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

  await Promise.all(orphanedUrls.map((url) => deleteAnyMediaFile(url)));

  const updatedTitle = clip(meta.title.trim(), "title");
  await logActivity(`${session.user.name} <${session.user.email}>`, "song_update", updatedTitle, {
    type: "Song",
    label: updatedTitle,
  });

  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
  return {};
}

export async function deleteSong(songId: string) {
  const session = await requireAdmin();
  const song = await prisma.song.delete({ where: { id: songId } });
  await logActivity(`${session.user.name} <${session.user.email}>`, "song_delete", song.title, {
    type: "Song",
    label: song.title,
  });
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
  // Already a final Storage/pasted URL by the time this reaches the server
  // (#63) — an Upload-tab file is resolved to its Storage URL client-side
  // before this action is ever called.
  const trimmedUrl = mediaUrl.trim();

  if (!trimmedLabel || !trimmedUrl) {
    return { error: "Label and URL (or an uploaded file) are required." };
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
  const media = await prisma.songMedia.delete({ where: { id: mediaId } });
  if (isOwnAnyMediaUrl(media.mediaUrl)) {
    await deleteAnyMediaFile(media.mediaUrl);
  }
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
