import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SONG_PART_OPTIONS, VOICE_TAGS, parseVoiceTags, type SongPartOption, type VoiceTag } from "@/lib/constants";
import DeleteSongButton from "../DeleteSongButton";

// This page reads live, admin-editable data — never statically cache it.
export const dynamic = "force-dynamic";

const PART_BADGE_CLASSES: Record<SongPartOption, string> = {
  S: "bg-rose-100 text-rose-600",
  A: "bg-amber-100 text-amber-600",
  T: "bg-sky-100 text-sky-600",
  B: "bg-indigo-100 text-indigo-600",
  All: "bg-ink/10 text-ink/70",
};

export default async function AdminSongOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      sections: { include: { media: true } },
      lyricSections: true,
    },
  });

  if (!song) notFound();

  const trackCount = song.sections.reduce((sum, s) => sum + s.media.length, 0);
  const partsPresent = SONG_PART_OPTIONS.filter((part) => song.sections.some((s) => s.part === part));

  const voiceTagsPresent = VOICE_TAGS.filter((tag) => tag !== "SATB").filter((tag) =>
    song.lyricSections.some((s) => {
      const tags = parseVoiceTags(s.voiceTags);
      return tags.includes(tag) || tags.includes("SATB" as VoiceTag);
    })
  );

  const segmentPreview = song.lyricSections.map((s) => s.sectionLabel);
  const segmentPreviewText =
    segmentPreview.slice(0, 3).join(" · ") + (segmentPreview.length > 3 ? " …" : "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <h1 className="text-3xl font-bold text-ink">{song.title}</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/admin/songs/${song.id}/edit`}
            className="rounded border border-ink/20 px-3 py-1.5 text-ink hover:bg-ink/5"
          >
            Edit
          </Link>
          <DeleteSongButton songId={song.id} redirectTo="/admin/songs" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border-l-4 border-gold bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Audio</h2>
            <span className="text-sm text-ink/50">{trackCount === 0 ? "None" : `${trackCount} tracks`}</span>
          </div>
          <p className="mb-3 text-sm text-ink/60">Voice parts &amp; recordings</p>
          {partsPresent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {partsPresent.map((part) => (
                <span
                  key={part}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${PART_BADGE_CLASSES[part]}`}
                >
                  {part === "All" ? "*" : part}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border-l-4 border-gold bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Lyrics</h2>
            <span className="text-sm text-ink/50">
              {song.lyricSections.length === 0 ? "None" : `${song.lyricSections.length} segments`}
            </span>
          </div>
          <p className="mb-3 text-sm text-ink/60">Per-voice lyrics &amp; annotations</p>
          {voiceTagsPresent.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {voiceTagsPresent.map((tag) => (
                <span
                  key={tag}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${PART_BADGE_CLASSES[tag as SongPartOption]}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {segmentPreviewText && <p className="text-xs text-ink/40">{segmentPreviewText}</p>}
        </div>
      </div>
    </div>
  );
}
