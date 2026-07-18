import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseVoiceTags } from "@/lib/constants";
import SongEditor from "./SongEditor";

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit song</h1>
      <SongEditor
        songId={song.id}
        initialMeta={{
          title: song.title,
          sectionLabel: song.sectionLabel,
          labelDescription: song.labelDescription,
        }}
        initialParts={song.parts.map((p) => ({ part: p.part, label: p.label, mediaUrl: p.mediaUrl }))}
        initialLyricSections={song.lyricSections.map((s) => ({
          sectionType: s.sectionType,
          sectionLabel: s.sectionLabel,
          content: s.content,
          voiceTags: parseVoiceTags(s.voiceTags),
        }))}
      />
    </div>
  );
}
