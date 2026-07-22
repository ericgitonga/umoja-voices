"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SONG_PART_OPTIONS,
  SONG_PART_LABEL_TEXT,
  LYRIC_SECTION_TYPES,
  VOICE_TAGS,
  VOICE_TAG_LABEL,
  type SongPartOption,
  type VoiceTag,
} from "@/lib/constants";
import {
  updateSongFull,
  createMediaUploadTicket,
  verifyAudioUpload,
  type SectionInput,
  type MediaInput,
  type LyricSectionInput,
} from "@/lib/actions/song-actions";
import { AUDIO_MAX_BYTES, AUDIO_ACCEPT, VIDEO_MAX_BYTES, VIDEO_ACCEPT } from "@/lib/media-constants";
import { describeUploadFailure } from "@/lib/upload-error";
import { uploadFileDirectly } from "@/lib/upload-client";

// Both direct-upload kinds share the same 20MB cap today; computed rather
// than hardcoded so this stays correct if either constant ever diverges.
const UPLOAD_MAX_BYTES = Math.max(AUDIO_MAX_BYTES, VIDEO_MAX_BYTES);
const MEDIA_ACCEPT = [AUDIO_ACCEPT, VIDEO_ACCEPT].join(",");

type Meta = { title: string; composer: string; lyricist: string; arranger: string };
type MediaMode = "paste" | "upload";

export default function SongEditor({
  songId,
  initialMeta,
  initialSections,
  initialLyricSections,
}: {
  songId: string;
  initialMeta: Meta;
  initialSections: SectionInput[];
  initialLyricSections: LyricSectionInput[];
}) {
  const router = useRouter();
  const [meta, setMeta] = useState(initialMeta);
  const [voiceSections, setVoiceSections] = useState<SectionInput[]>(initialSections);
  // Mirrors voiceSections[i].media[j] 1:1 — kept in sync by every mutator
  // below. Not part of SectionInput/MediaInput since it's pure UI state,
  // never sent to updateSongFull.
  const [mediaModes, setMediaModes] = useState<MediaMode[][]>(initialSections.map((s) => s.media.map(() => "paste")));
  // Also mirrors voiceSections[i].media[j] 1:1. A pending Upload-tab file
  // lives here rather than on MediaInput itself (#63) — the file must be
  // resolved to a Storage URL client-side (mint ticket + direct upload)
  // before updateSongFull is ever called, so MediaInput only ever carries a
  // final mediaUrl by the time it reaches that action.
  const [pendingFiles, setPendingFiles] = useState<(File | null)[][]>(initialSections.map((s) => s.media.map(() => null)));
  const [sections, setSections] = useState<LyricSectionInput[]>(initialLyricSections);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addVoiceSection() {
    setVoiceSections([
      ...voiceSections,
      { part: "S", sectionLabel: SONG_PART_LABEL_TEXT.S, labelDescription: "", media: [] },
    ]);
    setMediaModes([...mediaModes, []]);
    setPendingFiles([...pendingFiles, []]);
  }
  function updateVoiceSection(i: number, patch: Partial<SectionInput>) {
    setVoiceSections(voiceSections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function handleVoicePartChange(i: number, next: SongPartOption) {
    updateVoiceSection(i, { part: next, sectionLabel: SONG_PART_LABEL_TEXT[next] });
  }
  function removeVoiceSection(i: number) {
    setVoiceSections(voiceSections.filter((_, idx) => idx !== i));
    setMediaModes(mediaModes.filter((_, idx) => idx !== i));
    setPendingFiles(pendingFiles.filter((_, idx) => idx !== i));
  }
  function addMedia(i: number) {
    setVoiceSections(
      voiceSections.map((s, idx) => (idx === i ? { ...s, media: [...s.media, { label: "", mediaUrl: "" }] } : s))
    );
    setMediaModes(mediaModes.map((row, idx) => (idx === i ? [...row, "paste"] : row)));
    setPendingFiles(pendingFiles.map((row, idx) => (idx === i ? [...row, null] : row)));
  }
  function updateMedia(i: number, j: number, patch: Partial<MediaInput>) {
    setVoiceSections(
      voiceSections.map((s, idx) =>
        idx === i ? { ...s, media: s.media.map((m, mj) => (mj === j ? { ...m, ...patch } : m)) } : s
      )
    );
  }
  function updatePendingFile(i: number, j: number, file: File | null) {
    setPendingFiles(pendingFiles.map((row, idx) => (idx === i ? row.map((f, mj) => (mj === j ? file : f)) : row)));
  }
  function removeMedia(i: number, j: number) {
    setVoiceSections(
      voiceSections.map((s, idx) => (idx === i ? { ...s, media: s.media.filter((_, mj) => mj !== j) } : s))
    );
    setMediaModes(mediaModes.map((row, idx) => (idx === i ? row.filter((_, mj) => mj !== j) : row)));
    setPendingFiles(pendingFiles.map((row, idx) => (idx === i ? row.filter((_, mj) => mj !== j) : row)));
  }
  function setMediaMode(i: number, j: number, mode: MediaMode) {
    setMediaModes(mediaModes.map((row, idx) => (idx === i ? row.map((m, mj) => (mj === j ? mode : m)) : row)));
    // Switching modes discards whatever was in the other mode's field —
    // a row is either a pasted URL or an uploaded file, never both.
    if (mode === "paste") {
      updatePendingFile(i, j, null);
    } else {
      updateMedia(i, j, { mediaUrl: "" });
    }
  }

  function addSection() {
    setSections([...sections, { sectionType: "verse", sectionLabel: "", content: "", voiceTags: ["SATB"] }]);
  }
  function updateSection(i: number, patch: Partial<LyricSectionInput>) {
    setSections(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function toggleVoiceTag(i: number, tag: VoiceTag) {
    setSections(
      sections.map((s, idx) => {
        if (idx !== i) return s;
        const has = s.voiceTags.includes(tag);
        const next = has ? s.voiceTags.filter((t) => t !== tag) : [...s.voiceTags, tag];
        return { ...s, voiceTags: next.length ? next : ["SATB"] };
      })
    );
  }
  function removeSection(i: number) {
    setSections(sections.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const oversized = pendingFiles.some((row) => row.some((f) => f && f.size > UPLOAD_MAX_BYTES));
    if (oversized) {
      setStatus(`One or more uploaded files are too large — max ${UPLOAD_MAX_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      // Resolve every pending Upload-tab file to a Storage URL before
      // touching the DB (#63) — file bytes go straight from the browser to
      // Supabase Storage, bypassing Vercel's 4.5MB Function body limit, so
      // this can no longer happen as part of updateSongFull's own request.
      // Aborts on the first failed upload, same as the old server-side loop.
      const resolvedSections: SectionInput[] = [];
      for (let i = 0; i < voiceSections.length; i++) {
        const s = voiceSections[i];
        const resolvedMedia: MediaInput[] = [];
        for (let j = 0; j < s.media.length; j++) {
          const m = s.media[j];
          const file = pendingFiles[i]?.[j];
          if (file) {
            const ticket = await createMediaUploadTicket(file.name, file.size, file.type);
            if ("error" in ticket) {
              setStatus(ticket.error);
              return;
            }
            const uploaded = await uploadFileDirectly(ticket, file);
            if (uploaded.error) {
              setStatus(uploaded.error);
              return;
            }
            if (file.type.startsWith("audio/")) {
              const verified = await verifyAudioUpload(uploaded.url!);
              if (verified.error) {
                setStatus(verified.error);
                return;
              }
            }
            resolvedMedia.push({ ...m, mediaUrl: uploaded.url! });
          } else {
            resolvedMedia.push(m);
          }
        }
        resolvedSections.push({ ...s, media: resolvedMedia });
      }

      const result = await updateSongFull(songId, meta, resolvedSections, sections);
      if (result.error) {
        setStatus(result.error);
        return;
      }
      setVoiceSections(resolvedSections);
      setPendingFiles(resolvedSections.map((s) => s.media.map(() => null)));
      setMediaModes(resolvedSections.map((s) => s.media.map(() => "paste")));
      setStatus("Saved.");
      router.refresh();
    } catch (err) {
      setStatus(describeUploadFailure(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            value={meta.title}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Writer
          <input
            value={meta.lyricist}
            onChange={(e) => setMeta({ ...meta, lyricist: e.target.value })}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Composer
          <input
            value={meta.composer}
            onChange={(e) => setMeta({ ...meta, composer: e.target.value })}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Arranger
          <input
            value={meta.arranger}
            onChange={(e) => setMeta({ ...meta, arranger: e.target.value })}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Voice parts</h2>
          <button onClick={addVoiceSection} className="text-sm text-ink hover:underline">
            + Add section
          </button>
        </div>
        <div className="flex flex-col gap-6">
          {voiceSections.map((s, i) => (
            <div key={i} className="flex flex-col gap-3 rounded border border-ink/10 p-3">
              <div className="flex gap-2">
                <select
                  value={s.part}
                  onChange={(e) => handleVoicePartChange(i, e.target.value as SongPartOption)}
                  className="rounded border border-ink/20 px-2 py-1 text-sm"
                >
                  {SONG_PART_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {SONG_PART_LABEL_TEXT[opt]}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Auto-filled from Voice — edit for e.g. Tenor 1"
                  value={s.sectionLabel}
                  onChange={(e) => updateVoiceSection(i, { sectionLabel: e.target.value })}
                  className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm"
                />
                <button onClick={() => removeVoiceSection(i)} className="text-sm text-red-600">
                  Remove section
                </button>
              </div>
              <textarea
                placeholder="Label description"
                value={s.labelDescription}
                onChange={(e) => updateVoiceSection(i, { labelDescription: e.target.value })}
                rows={2}
                className="rounded border border-ink/20 px-2 py-1 text-sm"
              />

              <div className="flex flex-col gap-2 border-l-2 border-ink/10 pl-3">
                {s.media.map((m, j) => {
                  const mode = mediaModes[i]?.[j] ?? "paste";
                  return (
                    <div key={j} className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          placeholder="Media label, e.g. Tenor video"
                          value={m.label}
                          onChange={(e) => updateMedia(i, j, { label: e.target.value })}
                          className="rounded border border-ink/20 px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setMediaMode(i, j, "paste")}
                            className={mode === "paste" ? "font-medium text-ink underline" : "text-ink/40 hover:text-ink"}
                          >
                            Paste
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaMode(i, j, "upload")}
                            className={mode === "upload" ? "font-medium text-ink underline" : "text-ink/40 hover:text-ink"}
                          >
                            Upload
                          </button>
                        </div>
                        <button onClick={() => removeMedia(i, j)} className="text-sm text-red-600">
                          Remove
                        </button>
                      </div>
                      {mode === "paste" ? (
                        <input
                          placeholder="Media URL (YouTube, Drive, SoundCloud, direct file, or any link)"
                          value={m.mediaUrl}
                          onChange={(e) => updateMedia(i, j, { mediaUrl: e.target.value })}
                          className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm"
                        />
                      ) : (
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            accept={MEDIA_ACCEPT}
                            onChange={(e) => updatePendingFile(i, j, e.target.files?.[0] ?? null)}
                            className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-ink/40">
                            MP3/WAV/M4A/OGG audio or MP4/MOV/WEBM video — max {UPLOAD_MAX_BYTES / (1024 * 1024)}MB.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {s.media.length === 0 && <p className="text-xs text-ink/40">No media yet.</p>}
                <button onClick={() => addMedia(i)} className="self-start text-xs text-ink hover:underline">
                  + Add media
                </button>
              </div>
            </div>
          ))}
          {voiceSections.length === 0 && <p className="text-sm text-ink/50">No voice-part sections yet.</p>}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Lyrics</h2>
          <button onClick={addSection} className="text-sm text-ink hover:underline">
            + Add section
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {sections.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 rounded border border-ink/10 p-3">
              <div className="flex gap-2">
                <select
                  value={s.sectionType}
                  onChange={(e) => updateSection(i, { sectionType: e.target.value })}
                  className="rounded border border-ink/20 px-2 py-1 text-sm"
                >
                  {LYRIC_SECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Label, e.g. Verse 2"
                  value={s.sectionLabel}
                  onChange={(e) => updateSection(i, { sectionLabel: e.target.value })}
                  className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm"
                />
                <button onClick={() => removeSection(i)} className="text-sm text-red-600">
                  Remove
                </button>
              </div>
              <textarea
                placeholder="Lyric content"
                value={s.content}
                onChange={(e) => updateSection(i, { content: e.target.value })}
                rows={3}
                className="rounded border border-ink/20 px-2 py-1 text-sm"
              />
              <div className="flex items-center gap-3 text-xs">
                <span className="text-ink/50">Sung by:</span>
                {VOICE_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={s.voiceTags.includes(tag)}
                      onChange={() => toggleVoiceTag(i, tag)}
                    />
                    {VOICE_TAG_LABEL[tag]}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {sections.length === 0 && <p className="text-sm text-ink/50">No lyric sections yet.</p>}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save song"}
        </button>
        {status && <p className="text-sm text-ink/60">{status}</p>}
      </div>
    </div>
  );
}
