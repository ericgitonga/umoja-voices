import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import Breadcrumb from "@/components/Breadcrumb";
import ReplaceLyricsEditor from "@/components/ReplaceLyricsEditor";
import { parseVoiceTags } from "@/lib/constants";
import { serializeLyricsForEdit } from "@/lib/lyrics-parser";

export const dynamic = "force-dynamic";

export default async function EditLyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session?.user.role !== "admin") redirect(`/songs/${id}/lyrics`);

  const song = await prisma.song.findUnique({
    where: { id },
    include: { lyricSections: { orderBy: { sortOrder: "asc" } } },
  });

  if (!song) notFound();

  const hasExistingLyrics = song.lyricSections.length > 0;
  const initialText = hasExistingLyrics
    ? serializeLyricsForEdit(
        song.lyricSections.map((s) => ({
          sectionLabel: s.sectionLabel,
          content: s.content,
          voiceTags: parseVoiceTags(s.voiceTags),
        }))
      )
    : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "Songs", href: "/songs" },
          { label: song.title, href: `/songs/${song.id}` },
          { label: "Lyrics", href: `/songs/${song.id}/lyrics` },
          { label: "Edit" },
        ]}
      />

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">Edit Lyrics</p>
      <h1 className="mb-6 text-2xl font-semibold text-ink">{song.title}</h1>

      <ReplaceLyricsEditor songId={song.id} initialText={initialText} hasExistingLyrics={hasExistingLyrics} />
    </div>
  );
}
