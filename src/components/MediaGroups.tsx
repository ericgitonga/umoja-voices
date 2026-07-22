"use client";

import { useRef, useState } from "react";
import MediaEmbed from "@/components/MediaEmbed";
import RemoveMediaButton from "@/components/RemoveMediaButton";
import {
  SONG_PART_OPTIONS,
  SONG_PART_LABEL_TEXT,
  SONG_PART_TO_VOICE_TAG,
  VOICE_TAG_COLOR,
  type SongPartOption,
  type MediaKind,
} from "@/lib/constants";

type MediaItem = {
  id: string;
  label: string;
  mediaUrl: string;
  mediaKind: string;
  sectionLabel: string;
};

type Group = { part: SongPartOption; label: string; media: MediaItem[] };

// Individual voice parts show their short code (S/A/T/B, matching #67's own
// wording); the whole-choir part is internally "All" but reads as "SATB" —
// distinct from the "All" filter button below, which means "no filter".
const FILTER_LABEL = (part: SongPartOption) => (part === "All" ? "SATB" : part);

export default function MediaGroups({
  groups,
  isAdmin,
  songId,
}: {
  groups: Group[];
  isAdmin: boolean;
  songId: string;
}) {
  const [activeFilter, setActiveFilter] = useState<SongPartOption | null>(null);
  // #41: only one <audio>/<video> element plays at a time across the whole
  // media list — starting a new one pauses whichever was previously
  // playing. Iframe-embedded players (YouTube/Drive/SoundCloud) can't be
  // programmatically paused cross-origin, so they're a known exception.
  const nowPlayingRef = useRef<HTMLMediaElement | null>(null);
  function handlePlay(el: HTMLMediaElement) {
    if (nowPlayingRef.current && nowPlayingRef.current !== el) {
      nowPlayingRef.current.pause();
    }
    nowPlayingRef.current = el;
  }

  const visible = groups.filter((g) => (activeFilter ? g.part === activeFilter : true) && g.media.length > 0);
  const activeGroup = activeFilter ? groups.find((g) => g.part === activeFilter) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => setActiveFilter(null)}
          className={`rounded-full px-3 py-1 font-medium ${
            activeFilter === null ? "bg-ink text-white" : "bg-ink/10 text-ink/60 hover:bg-ink/20"
          }`}
        >
          All
        </button>
        {SONG_PART_OPTIONS.map((opt) => {
          const color = VOICE_TAG_COLOR[SONG_PART_TO_VOICE_TAG[opt]];
          return (
            <button
              key={opt}
              onClick={() => setActiveFilter(activeFilter === opt ? null : opt)}
              className={`rounded-full px-3 py-1 ${activeFilter === opt ? color.solid : color.pill}`}
            >
              {FILTER_LABEL(opt)}
            </button>
          );
        })}
      </div>

      {activeFilter && (!activeGroup || activeGroup.media.length === 0) && (
        <p className="text-ink/50">No {SONG_PART_LABEL_TEXT[activeFilter]} media yet.</p>
      )}

      {visible.map((group) => (
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
              <div key={m.id} data-testid={`song-media-${m.id}`} className="rounded-lg border border-ink/10 bg-white p-3">
                <p className="mb-1 text-sm font-medium text-ink/80">{m.label}</p>
                <MediaEmbed url={m.mediaUrl} kind={m.mediaKind as MediaKind} onPlay={handlePlay} />
                {isAdmin && (
                  <div className="mt-2">
                    <RemoveMediaButton songId={songId} mediaId={m.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {activeFilter === null && visible.length === 0 && <p className="text-ink/50">No media added yet.</p>}
    </div>
  );
}
