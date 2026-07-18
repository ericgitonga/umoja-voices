import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MediaEmbed from "@/components/MediaEmbed";
import LyricsViewer from "@/components/LyricsViewer";
import { parseVoiceTags, type MediaKind } from "@/lib/constants";

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{song.title}</h1>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-ink">Voice parts</h2>
        <div className="flex flex-col gap-6">
          {song.sections.map((section) => (
            <div key={section.id}>
              <h3 className="font-semibold text-ink">{section.sectionLabel}</h3>
              {section.labelDescription && (
                <p className="mb-2 text-sm text-ink/60">{section.labelDescription}</p>
              )}
              <div className="flex flex-col gap-4">
                {section.media.map((m) => (
                  <div key={m.id}>
                    <p className="mb-1 text-sm font-medium text-ink/80">{m.label}</p>
                    <MediaEmbed url={m.mediaUrl} kind={m.mediaKind as MediaKind} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {song.sections.length === 0 && <p className="text-ink/50">No recordings uploaded yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Lyrics</h2>
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
