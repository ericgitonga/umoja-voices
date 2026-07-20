"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSongMedia } from "@/lib/actions/song-actions";
import { SONG_PART_OPTIONS, SONG_PART_LABEL_TEXT, type SongPartOption } from "@/lib/constants";
import { AUDIO_MAX_BYTES, AUDIO_ACCEPT } from "@/lib/media-constants";

type Mode = "paste" | "upload";

export default function AddAudioForm({ songId }: { songId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [part, setPart] = useState<SongPartOption>("S");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setUrl("");
    setFile(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || (mode === "paste" ? !url.trim() : !file)) {
      setError(mode === "paste" ? "URL, Label, and Voice are all required." : "A file, Label, and Voice are all required.");
      return;
    }
    if (mode === "upload" && file && file.size > AUDIO_MAX_BYTES) {
      setError(`File is too large — max ${AUDIO_MAX_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await addSongMedia(songId, part, label, mode === "paste" ? url : "", mode === "upload" ? file : null);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUrl("");
    setFile(null);
    setLabel("");
    setPart("S");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
      <h3 className="font-semibold text-ink">Add Audio</h3>

      <div className="flex gap-4 border-b border-ink/10 text-sm">
        <button
          type="button"
          onClick={() => switchMode("paste")}
          className={
            mode === "paste"
              ? "border-b-2 border-ink px-1 pb-2 font-medium text-ink"
              : "px-1 pb-2 text-ink/50 hover:text-ink"
          }
        >
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={
            mode === "upload"
              ? "border-b-2 border-ink px-1 pb-2 font-medium text-ink"
              : "px-1 pb-2 text-ink/50 hover:text-ink"
          }
        >
          Upload file
        </button>
      </div>

      {mode === "paste" ? (
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
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Audio file <span className="text-red-600">*</span>
          <input
            required
            type="file"
            accept={AUDIO_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded border border-ink/20 px-3 py-2"
          />
          <span className="text-xs text-ink/50">
            MP3, WAV, M4A, or OGG — max {AUDIO_MAX_BYTES / (1024 * 1024)}MB.
          </span>
        </label>
      )}

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
