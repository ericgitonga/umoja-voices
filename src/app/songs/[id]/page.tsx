import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MediaEmbed from "@/components/MediaEmbed";
import LyricsViewer from "@/components/LyricsViewer";
import {
  SONG_SECTION_LABEL_TEXT,
  parseVoiceTags,
  type MediaKind,
  type SongSectionLabel,
} from "@/lib/constants";

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      parts: { orderBy: { sortOrder: "asc" } },
      lyricSections: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!song) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{song.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {SONG_SECTION_LABEL_TEXT[song.sectionLabel as SongSectionLabel] ?? song.sectionLabel}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{song.labelDescription}</p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Voice parts</h2>
        <div className="flex flex-col gap-4">
          {song.parts.map((part) => (
            <div key={part.id}>
              <p className="mb-1 text-sm font-medium text-slate-700">{part.label}</p>
              <MediaEmbed url={part.mediaUrl} kind={part.mediaKind as MediaKind} />
            </div>
          ))}
          {song.parts.length === 0 && <p className="text-slate-500">No recordings uploaded yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Lyrics</h2>
        <LyricsViewer
          sections={song.lyricSections.map((s) => ({
            id: s.id,
            sectionType: s.sectionType,
            sectionLabel: s.sectionLabel,
            content: s.content,
            voiceTags: parseVoiceTags(s.voiceTags),
            sortOrder: s.sortOrder,
          }))}
        />
      </section>
    </div>
  );
}
