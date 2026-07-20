import { createSong } from "@/lib/actions/song-actions";

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
          Writer
          <input name="lyricist" className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Composer
          <input name="composer" className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Arranger
          <input name="arranger" className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
          Create and continue
        </button>
      </form>
    </div>
  );
}
