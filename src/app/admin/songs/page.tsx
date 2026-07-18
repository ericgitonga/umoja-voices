import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SONG_SECTION_LABEL_TEXT, type SongSectionLabel } from "@/lib/constants";
import DeleteSongButton from "./DeleteSongButton";

export default async function AdminSongsPage() {
  const songs = await prisma.song.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Songs</h1>
        <Link href="/admin/songs/new" className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800">
          New song
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {songs.map((song) => (
          <li key={song.id} className="flex items-center justify-between rounded border border-slate-200 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{song.title}</p>
              <p className="text-xs text-slate-500">
                {SONG_SECTION_LABEL_TEXT[song.sectionLabel as SongSectionLabel] ?? song.sectionLabel}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/admin/songs/${song.id}/edit`} className="text-indigo-700 hover:underline">
                Edit
              </Link>
              <DeleteSongButton songId={song.id} />
            </div>
          </li>
        ))}
        {songs.length === 0 && <p className="text-slate-500">No songs yet.</p>}
      </ul>
    </div>
  );
}
