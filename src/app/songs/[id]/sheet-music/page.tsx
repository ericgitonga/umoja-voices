import { notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import RemoveSheetMusicButton from "@/components/RemoveSheetMusicButton";
import AddSheetMusicForm from "@/components/AddSheetMusicForm";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function SongSheetMusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const song = await prisma.song.findUnique({
    where: { id },
    include: { sheetMusic: { orderBy: { sortOrder: "asc" } } },
  });

  if (!song) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "Songs", href: "/songs" },
          { label: song.title, href: `/songs/${song.id}` },
          { label: "Sheet Music" },
        ]}
      />

      <h1 className="mb-6 text-2xl font-semibold text-ink">{song.title} — Sheet Music</h1>

      <div className="flex flex-col gap-3">
        {song.sheetMusic.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-ink/10 bg-white p-3"
          >
            <a
              href={s.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-ink hover:underline"
            >
              {s.label}
            </a>
            {isAdmin && <RemoveSheetMusicButton songId={song.id} sheetMusicId={s.id} />}
          </div>
        ))}
        {song.sheetMusic.length === 0 && <p className="text-ink/50">No sheet music added yet.</p>}
      </div>

      {isAdmin && (
        <div className="mt-10">
          <AddSheetMusicForm songId={song.id} />
        </div>
      )}
    </div>
  );
}
