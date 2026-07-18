import { createSong } from "@/lib/actions/song-actions";
import { SONG_SECTION_LABELS, SONG_SECTION_LABEL_TEXT, type SongSectionLabel } from "@/lib/constants";

export default function NewSongPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">New song</h1>
      <form action={createSong} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input name="title" required className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Section label
          <select name="sectionLabel" className="rounded border border-ink/20 px-3 py-2" defaultValue="SATB_COMPULSORY">
            {SONG_SECTION_LABELS.map((l) => (
              <option key={l} value={l}>
                {SONG_SECTION_LABEL_TEXT[l as SongSectionLabel]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Label description
          <textarea
            name="labelDescription"
            required
            rows={2}
            placeholder="e.g. Required for all members, closing set of the tour"
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
          Create and continue
        </button>
      </form>
    </div>
  );
}
