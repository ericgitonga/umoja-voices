import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SongsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "admin";

  const songs = await prisma.song.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Songs</h1>
        {isAdmin && (
          <Link href="/admin/songs/new" className="rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90">
            Add Song
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/songs/${song.id}`}
            className="rounded-lg border-l-4 border-gold bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
          >
            <p className="font-bold text-ink">{song.title}</p>
            {(song.lyricist || song.composer) && (
              <p className="text-sm text-ink/60">
                {song.lyricist && `Words: ${song.lyricist}`}
                {song.lyricist && song.composer && " "}
                {song.composer && `Music: ${song.composer}`}
              </p>
            )}
          </Link>
        ))}
        {songs.length === 0 && <p className="text-ink/50">No songs yet.</p>}
      </div>
    </div>
  );
}
