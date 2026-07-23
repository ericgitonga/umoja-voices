import Breadcrumb from "@/components/Breadcrumb";
import SongEditor from "../[id]/edit/SongEditor";

export default function NewSongPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb items={[{ label: "Songs", href: "/songs" }, { label: "New song" }]} />
      <h1 className="mb-6 text-2xl font-semibold text-ink">New song</h1>
      <SongEditor
        songId={null}
        initialMeta={{ title: "", composer: "", lyricist: "", arranger: "" }}
        initialSections={[]}
        initialLyricSections={[]}
      />
    </div>
  );
}
