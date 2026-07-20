import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import LyricsViewer from "@/components/LyricsViewer";
import Breadcrumb from "@/components/Breadcrumb";
import { parseVoiceTags } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SongLyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const song = await prisma.song.findUnique({
    where: { id },
    include: { lyricSections: { orderBy: { sortOrder: "asc" } } },
  });

  if (!song) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "Songs", href: "/songs" },
          { label: song.title, href: `/songs/${song.id}` },
          { label: "Lyrics" },
        ]}
      />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{song.title}</h1>
          {song.lyricist && <p className="text-sm text-ink/60">Writer: {song.lyricist}</p>}
          {song.composer && <p className="text-sm text-ink/60">Composer: {song.composer}</p>}
          {song.arranger && <p className="text-sm text-ink/60">Arranger: {song.arranger}</p>}
        </div>
        {isAdmin && (
          <Link
            href={`/songs/${song.id}/lyrics/edit`}
            className="rounded border border-ink/20 px-3 py-1.5 text-sm text-ink hover:bg-ink/5"
          >
            Edit
          </Link>
        )}
      </div>

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
    </div>
  );
}
