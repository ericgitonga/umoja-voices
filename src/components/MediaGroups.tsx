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

// Only native <audio>/<video> can participate in Play All's auto-advance
// sequence or Loop's whole-sequence restart (#84) -- iframe-embedded kinds
// (youtube/drive/soundcloud) can't be hooked into cross-origin (#41; full
// embed-API support tracked separately in #86), so they're skipped in the
// sequence rather than blocking the rest of it.
function isPlayableKind(kind: string): boolean {
  return kind === "audio" || kind === "video";
}

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
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playAllEnabled, setPlayAllEnabled] = useState(false);
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

  // #84: every currently-mounted playable (audio/video) element, keyed by
  // media id, so Play All's auto-advance and Loop's whole-sequence restart
  // can call .play() on a specific one externally.
  const mediaElementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());
  function registerMediaElement(id: string, el: HTMLMediaElement | null) {
    if (el) mediaElementsRef.current.set(id, el);
    else mediaElementsRef.current.delete(id);
  }

  const visible = groups.filter((g) => (activeFilter ? g.part === activeFilter : true) && g.media.length > 0);
  const activeGroup = activeFilter ? groups.find((g) => g.part === activeFilter) : null;

  // The Play All sequence, scoped to whatever's currently visible per the
  // active filter (#67) — recomputed every render so switching filters (or
  // the underlying media list changing) always reflects the current state.
  const playableIds = visible.flatMap((g) => g.media.filter((m) => isPlayableKind(m.mediaKind)).map((m) => m.id));
  const hasPlayableMedia = playableIds.length > 0;

  function handleTogglePlayAll() {
    if (playAllEnabled) {
      // Turning off doesn't interrupt whatever's currently playing — it
      // only stops auto-advancing to the next item.
      setPlayAllEnabled(false);
      return;
    }
    setPlayAllEnabled(true);
    const first = playableIds[0];
    if (first) mediaElementsRef.current.get(first)?.play();
  }

  function handleEnded(mediaId: string) {
    if (!playAllEnabled) return;
    const idx = playableIds.indexOf(mediaId);
    const nextId = idx >= 0 ? playableIds[idx + 1] : undefined;
    if (nextId) {
      mediaElementsRef.current.get(nextId)?.play();
    } else if (loopEnabled) {
      // Reached the end of the sequence — Loop restarts it from the top.
      const firstId = playableIds[0];
      if (firstId) mediaElementsRef.current.get(firstId)?.play();
    }
  }

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

        <span className="mx-1 h-5 w-px bg-ink/10" aria-hidden />

        <button
          type="button"
          onClick={() => setLoopEnabled((v) => !v)}
          disabled={!hasPlayableMedia}
          className={`rounded-full px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
            loopEnabled ? "bg-ink text-white" : "bg-ink/10 text-ink/60 hover:bg-ink/20"
          }`}
        >
          Loop
        </button>
        <button
          type="button"
          onClick={handleTogglePlayAll}
          disabled={!hasPlayableMedia}
          className={`rounded-full px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
            playAllEnabled ? "bg-ink text-white" : "bg-ink/10 text-ink/60 hover:bg-ink/20"
          }`}
        >
          Play All
        </button>
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
                <MediaEmbed
                  url={m.mediaUrl}
                  kind={m.mediaKind as MediaKind}
                  onPlay={handlePlay}
                  onEnded={() => handleEnded(m.id)}
                  loop={loopEnabled && !playAllEnabled}
                  mediaRef={(el) => registerMediaElement(m.id, el)}
                />
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
