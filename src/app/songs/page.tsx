import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SONG_PART_OPTIONS, SONG_PART_LABEL_TEXT, type SongPartOption } from "@/lib/constants";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ label?: string }>;
}) {
  const { label } = await searchParams;
  const filter = label && (SONG_PART_OPTIONS as readonly string[]).includes(label) ? label : undefined;

  const songs = await prisma.song.findMany({
    where: filter ? { sections: { some: { part: filter } } } : undefined,
    orderBy: { title: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Songs</h1>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/songs"
          className={`rounded-full px-3 py-1.5 ${!filter ? "bg-ink text-white" : "border border-ink/10 bg-white text-ink/70"}`}
        >
          All
        </Link>
        {SONG_PART_OPTIONS.map((l) => (
          <Link
            key={l}
            href={`/songs?label=${l}`}
            className={`rounded-full px-3 py-1.5 ${filter === l ? "bg-ink text-white" : "border border-ink/10 bg-white text-ink/70"}`}
          >
            {SONG_PART_LABEL_TEXT[l as SongPartOption]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/songs/${song.id}`}
            className="rounded-lg border-l-4 border-gold bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
          >
            <p className="font-bold text-ink">{song.title}</p>
          </Link>
        ))}
        {songs.length === 0 && <p className="text-ink/50">No songs yet.</p>}
      </div>
    </div>
  );
}
