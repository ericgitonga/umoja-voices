"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SONG_PART_OPTIONS, LYRIC_SECTION_TYPES, VOICE_TAGS, type VoiceTag } from "@/lib/constants";
import {
  updateSongFull,
  type SectionInput,
  type MediaInput,
  type LyricSectionInput,
} from "@/lib/actions/song-actions";

type Meta = { title: string };

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
  const [sections, setSections] = useState<LyricSectionInput[]>(initialLyricSections);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addVoiceSection() {
    setVoiceSections([...voiceSections, { part: "S", sectionLabel: "", labelDescription: "", media: [] }]);
  }
  function updateVoiceSection(i: number, patch: Partial<SectionInput>) {
    setVoiceSections(voiceSections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeVoiceSection(i: number) {
    setVoiceSections(voiceSections.filter((_, idx) => idx !== i));
  }
  function addMedia(i: number) {
    setVoiceSections(
      voiceSections.map((s, idx) => (idx === i ? { ...s, media: [...s.media, { label: "", mediaUrl: "" }] } : s))
    );
  }
  function updateMedia(i: number, j: number, patch: Partial<MediaInput>) {
    setVoiceSections(
      voiceSections.map((s, idx) =>
        idx === i ? { ...s, media: s.media.map((m, mj) => (mj === j ? { ...m, ...patch } : m)) } : s
      )
    );
  }
  function removeMedia(i: number, j: number) {
    setVoiceSections(
      voiceSections.map((s, idx) => (idx === i ? { ...s, media: s.media.filter((_, mj) => mj !== j) } : s))
    );
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
    setSaving(true);
    setStatus(null);
    const result = await updateSongFull(songId, meta, voiceSections, sections);
    setSaving(false);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    setStatus("Saved.");
    router.refresh();
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
                  onChange={(e) => updateVoiceSection(i, { part: e.target.value })}
                  className="rounded border border-ink/20 px-2 py-1 text-sm"
                >
                  {SONG_PART_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Section label, e.g. Tenor"
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
                {s.media.map((m, j) => (
                  <div key={j} className="flex gap-2">
                    <input
                      placeholder="Media label, e.g. Tenor video"
                      value={m.label}
                      onChange={(e) => updateMedia(i, j, { label: e.target.value })}
                      className="rounded border border-ink/20 px-2 py-1 text-sm"
                    />
                    <input
                      placeholder="Media URL (YouTube, Drive, SoundCloud, direct file, or any link)"
                      value={m.mediaUrl}
                      onChange={(e) => updateMedia(i, j, { mediaUrl: e.target.value })}
                      className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm"
                    />
                    <button onClick={() => removeMedia(i, j)} className="text-sm text-red-600">
                      Remove
                    </button>
                  </div>
                ))}
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
                    {tag}
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
