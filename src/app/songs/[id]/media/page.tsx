import { notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import MediaEmbed from "@/components/MediaEmbed";
import RemoveMediaButton from "@/components/RemoveMediaButton";
import AddMediaForm from "@/components/AddMediaForm";
import Breadcrumb from "@/components/Breadcrumb";
import {
  SONG_PART_OPTIONS,
  SONG_PART_LABEL_TEXT,
  SONG_PART_TO_VOICE_TAG,
  VOICE_TAG_COLOR,
  type MediaKind,
} from "@/lib/constants";

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

  const groups = SONG_PART_OPTIONS.map((part) => ({
    part,
    label: SONG_PART_LABEL_TEXT[part],
    media: song.sections
      .filter((s) => s.part === part)
      .flatMap((s) => s.media.map((m) => ({ ...m, sectionLabel: s.sectionLabel }))),
  })).filter((g) => g.media.length > 0);

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

      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <section
            key={group.part}
            className={`border-l-4 pl-4 ${VOICE_TAG_COLOR[SONG_PART_TO_VOICE_TAG[group.part]].border}`}
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
              <span className={`rounded px-1.5 py-0.5 ${VOICE_TAG_COLOR[SONG_PART_TO_VOICE_TAG[group.part]].pill}`}>
                {group.part}
              </span>
              {group.label}
            </h2>
            <div className="flex flex-col gap-4">
              {group.media.map((m) => (
                <div key={m.id} className="rounded-lg border border-ink/10 bg-white p-3">
                  <p className="mb-1 text-sm font-medium text-ink/80">{m.label}</p>
                  <MediaEmbed url={m.mediaUrl} kind={m.mediaKind as MediaKind} />
                  {isAdmin && (
                    <div className="mt-2">
                      <RemoveMediaButton songId={song.id} mediaId={m.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && <p className="text-ink/50">No media added yet.</p>}
      </div>

      {isAdmin && (
        <div className="mt-10">
          <AddMediaForm songId={song.id} />
        </div>
      )}
    </div>
  );
}

