import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import DeleteSongButton from "@/components/DeleteSongButton";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      },
      lyricSections: { orderBy: { sortOrder: "asc" } },
      sheetMusic: true,
    },
  });

  if (!song) notFound();

  const mediaCount = song.sections.reduce((sum, s) => sum + s.media.length, 0);
  const partsPresent = Array.from(new Set(song.sections.map((s) => s.part)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "Songs", href: "/songs" }, { label: song.title }]} />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{song.title}</h1>
          {song.lyricist && <p className="text-sm text-ink/60">Writer: {song.lyricist}</p>}
          {song.composer && <p className="text-sm text-ink/60">Composer: {song.composer}</p>}
          {song.arranger && <p className="text-sm text-ink/60">Arranger: {song.arranger}</p>}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/admin/songs/${song.id}/edit`}
              className="rounded border border-ink/20 px-3 py-1.5 text-ink hover:bg-ink/5"
            >
              Edit
            </Link>
            <DeleteSongButton songId={song.id} redirectTo="/songs" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href={`/songs/${song.id}/media`}
          className="rounded-lg border-l-4 border-gold bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
        >
          <p className="font-semibold text-ink">Media</p>
          <p className="mb-2 text-sm text-ink/60">
            {mediaCount} {mediaCount === 1 ? "track" : "tracks"}
          </p>
          {partsPresent.length > 0 && (
            <div className="flex gap-1">
              {partsPresent.map((p) => (
                <span key={p} className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium text-ink/60">
                  {p}
                </span>
              ))}
            </div>
          )}
        </Link>

        <Link
          href={`/songs/${song.id}/sheet-music`}
          className="rounded-lg border-l-4 border-ink/20 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
        >
          <p className="font-semibold text-ink">Sheet Music</p>
          <p className="text-sm text-ink/60">
            {song.sheetMusic.length === 0
              ? "None"
              : `${song.sheetMusic.length} ${song.sheetMusic.length === 1 ? "file" : "files"}`}
          </p>
        </Link>

        <Link
          href={`/songs/${song.id}/lyrics`}
          className="rounded-lg border-l-4 border-ink/20 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
        >
          <p className="font-semibold text-ink">Lyrics</p>
          <p className="text-sm text-ink/60">
            {song.lyricSections.length} {song.lyricSections.length === 1 ? "segment" : "segments"}
          </p>
        </Link>
      </div>
    </div>
  );
}
