"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addSheetMusic } from "@/lib/actions/sheet-music-actions";
import { SHEET_MUSIC_MAX_BYTES, SHEET_MUSIC_ACCEPT } from "@/lib/media-constants";

export default function AddSheetMusicForm({ songId }: { songId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !file) {
      setError("A PDF file and a label are both required.");
      return;
    }
    if (file.size > SHEET_MUSIC_MAX_BYTES) {
      setError(`File is too large — max ${SHEET_MUSIC_MAX_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await addSheetMusic(songId, label, file);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFile(null);
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
      <h3 className="font-semibold text-ink">Add Sheet Music</h3>

      <label className="flex flex-col gap-1 text-sm">
        PDF file <span className="text-red-600">*</span>
        <input
          ref={fileInputRef}
          required
          type="file"
          accept={SHEET_MUSIC_ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded border border-ink/20 px-3 py-2"
        />
        <span className="text-xs text-ink/50">PDF only — max {SHEET_MUSIC_MAX_BYTES / (1024 * 1024)}MB.</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Label <span className="text-red-600">*</span>
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Full score, Soprano part"
          className="rounded border border-ink/20 px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Adding…" : "Add Sheet Music"}
      </button>
    </form>
  );
}
