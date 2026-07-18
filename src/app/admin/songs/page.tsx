import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SONG_SECTION_LABEL_TEXT, type SongSectionLabel } from "@/lib/constants";
import DeleteSongButton from "./DeleteSongButton";

export default async function AdminSongsPage() {
  const songs = await prisma.song.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Songs</h1>
        <Link href="/admin/songs/new" className="rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90">
          New song
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {songs.map((song) => (
          <div
            key={song.id}
            className="rounded-lg border-l-4 border-gold bg-white px-5 py-4 shadow-sm"
          >
            <p className="font-bold text-ink">{song.title}</p>
            <p className="mt-1 text-xs text-ink/50">
              {SONG_SECTION_LABEL_TEXT[song.sectionLabel as SongSectionLabel] ?? song.sectionLabel}
            </p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Link href={`/admin/songs/${song.id}/edit`} className="text-ink hover:underline">
                Edit
              </Link>
              <DeleteSongButton songId={song.id} />
            </div>
          </div>
        ))}
        {songs.length === 0 && <p className="text-ink/50">No songs yet.</p>}
      </div>
    </div>
  );
}
