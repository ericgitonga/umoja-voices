"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSongMedia } from "@/lib/actions/song-actions";
import { SONG_PART_OPTIONS, SONG_PART_LABEL_TEXT, type SongPartOption } from "@/lib/constants";

export default function AddAudioForm({ songId }: { songId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [part, setPart] = useState<SongPartOption>("S");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !label.trim()) {
      setError("URL, Label, and Voice are all required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await addSongMedia(songId, part, label, url);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUrl("");
    setLabel("");
    setPart("S");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
      <h3 className="font-semibold text-ink">Add Audio</h3>

      <label className="flex flex-col gap-1 text-sm">
        URL <span className="text-red-600">*</span>
        <input
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube, Spotify, Google Drive, or direct URL"
          className="rounded border border-ink/20 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Label <span className="text-red-600">*</span>
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Soprano part, Full choir recording"
          className="rounded border border-ink/20 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Voice <span className="text-red-600">*</span>
        <select
          required
          value={part}
          onChange={(e) => setPart(e.target.value as SongPartOption)}
          className="rounded border border-ink/20 px-3 py-2"
        >
          {SONG_PART_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {SONG_PART_LABEL_TEXT[opt]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Adding…" : "Add Audio"}
      </button>
    </form>
  );
}
