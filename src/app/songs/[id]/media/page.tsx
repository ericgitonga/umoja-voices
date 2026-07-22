import { notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import AddMediaForm from "@/components/AddMediaForm";
import Breadcrumb from "@/components/Breadcrumb";
import MediaGroups from "@/components/MediaGroups";
import { SONG_PART_OPTIONS, SONG_PART_LABEL_TEXT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SongMediaPage({ params }: { params: Promise<{ id: string }> }) {
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
    },
  });

  if (!song) notFound();

  // Every voice part is always present here (even with zero media) so the
  // filter buttons in MediaGroups can show an accurate empty state per
  // voice, rather than only offering buttons for parts that already have
  // something uploaded.
  const groups = SONG_PART_OPTIONS.map((part) => ({
    part,
    label: SONG_PART_LABEL_TEXT[part],
    media: song.sections
      .filter((s) => s.part === part)
      .flatMap((s) => s.media.map((m) => ({ ...m, sectionLabel: s.sectionLabel }))),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "Songs", href: "/songs" },
          { label: song.title, href: `/songs/${song.id}` },
          { label: "Media" },
        ]}
      />

      <h1 className="mb-6 text-2xl font-semibold text-ink">{song.title} — Media</h1>

      <MediaGroups groups={groups} isAdmin={isAdmin} songId={song.id} />

      {isAdmin && (
        <div className="mt-10">
          <AddMediaForm songId={song.id} />
        </div>
      )}
    </div>
  );
}
