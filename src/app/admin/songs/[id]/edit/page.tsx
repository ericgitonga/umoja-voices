import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseVoiceTags } from "@/lib/constants";
import Breadcrumb from "@/components/Breadcrumb";
import SongEditor from "./SongEditor";

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      },
      lyricSections: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!song) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb items={[{ label: "Songs", href: "/songs" }, { label: song.title }]} />
      <h1 className="mb-6 text-2xl font-semibold text-ink">Edit song</h1>
      <SongEditor
        songId={song.id}
        initialMeta={{
          title: song.title,
          composer: song.composer ?? "",
          lyricist: song.lyricist ?? "",
          arranger: song.arranger ?? "",
        }}
        initialSections={song.sections.map((s) => ({
          part: s.part,
          sectionLabel: s.sectionLabel,
          labelDescription: s.labelDescription,
          media: s.media.map((m) => ({ label: m.label, mediaUrl: m.mediaUrl })),
        }))}
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
