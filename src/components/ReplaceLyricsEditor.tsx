"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseLyricsPaste, type ParsedLyricSection } from "@/lib/lyrics-parser";
import { VOICE_TAG_LABEL } from "@/lib/constants";
import { replaceLyrics } from "@/lib/actions/song-actions";

const PLACEHOLDER = `Paste lyrics here.
Separate segments with a blank line.
Optionally tag lines with [S], [A], [T], [B], or [ALL].
Use section labels like "Verse 1" or "Chorus" on their own line.`;

export default function ReplaceLyricsEditor({
  songId,
  initialText,
  hasExistingLyrics,
}: {
  songId: string;
  initialText: string;
  hasExistingLyrics: boolean;
}) {
  const router = useRouter();
  const [rawText, setRawText] = useState(initialText);
  const [preview, setPreview] = useState<ParsedLyricSection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePreview() {
    setPreview(parseLyricsPaste(rawText));
    setError(null);
  }

  async function handleSave() {
    if (!preview) return;
    if (hasExistingLyrics && !confirm("Replace the existing lyrics for this song? This cannot be undone.")) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await replaceLyrics(songId, preview);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/songs/${songId}/lyrics`);
  }

  function handleCancel() {
    router.push(`/songs/${songId}/lyrics`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 border-b border-ink/10 text-sm">
        <span className="border-b-2 border-ink px-1 pb-2 font-medium text-ink">Paste</span>
        <span
          title="File upload is coming soon"
          className="cursor-not-allowed px-1 pb-2 text-ink/30"
        >
          Upload
        </span>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          setPreview(null);
        }}
        placeholder={PLACEHOLDER}
        rows={12}
        className="rounded border border-ink/20 px-3 py-2 font-mono text-sm"
      />

      <button
        onClick={handlePreview}
        className="self-start rounded-full bg-ink/80 px-4 py-2 text-sm text-white hover:opacity-90"
      >
        Preview
      </button>

      {preview && (
        <div className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
          <p className="text-sm font-medium text-ink/70">
            Preview — {preview.length} {preview.length === 1 ? "segment" : "segments"}
          </p>
          {preview.map((s, i) => (
            <div key={i} className="rounded border border-ink/10 p-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-ink/50">#{i + 1}</span>
                <span className="text-sm font-semibold text-ink">{s.sectionLabel}</span>
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium text-ink/60">
                  {VOICE_TAG_LABEL[s.voiceTags[0]]}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm text-ink/80">{s.content}</p>
            </div>
          ))}
          {preview.length === 0 && <p className="text-sm text-ink/50">Nothing parsed yet.</p>}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4">
        {preview && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={`rounded-full px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60 ${
              hasExistingLyrics ? "bg-red-600" : "bg-ink"
            }`}
          >
            {saving ? "Saving…" : hasExistingLyrics ? "Replace Lyrics" : "Save"}
          </button>
        )}
        <button onClick={handleCancel} className="text-sm text-ink/60 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
