import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SONG_SECTION_LABELS, SONG_SECTION_LABEL_TEXT, type SongSectionLabel } from "@/lib/constants";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ label?: string }>;
}) {
  const { label } = await searchParams;
  const filter = label && (SONG_SECTION_LABELS as readonly string[]).includes(label) ? label : undefined;

  const songs = await prisma.song.findMany({
    where: filter ? { sectionLabel: filter } : undefined,
    orderBy: { title: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Songs</h1>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/songs"
          className={`rounded-full px-3 py-1 ${!filter ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          All
        </Link>
        {SONG_SECTION_LABELS.map((l) => (
          <Link
            key={l}
            href={`/songs?label=${l}`}
            className={`rounded-full px-3 py-1 ${filter === l ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {SONG_SECTION_LABEL_TEXT[l as SongSectionLabel]}
          </Link>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {songs.map((song) => (
          <li key={song.id}>
            <Link
              href={`/songs/${song.id}`}
              className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{song.title}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {SONG_SECTION_LABEL_TEXT[song.sectionLabel as SongSectionLabel] ?? song.sectionLabel}
              </span>
            </Link>
          </li>
        ))}
        {songs.length === 0 && <p className="text-slate-500">No songs yet.</p>}
      </ul>
    </div>
  );
}
