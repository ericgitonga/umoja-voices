"use client";

import { useEffect, useId, useRef } from "react";
import type { MediaKind } from "@/lib/constants";
import type { PlayableHandle } from "@/lib/playable";
import { loadYouTubeIframeApi, type YTPlayer } from "@/lib/youtube-player";
import { loadSoundCloudWidgetApi, type SCWidget } from "@/lib/soundcloud-widget";

function youtubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  return match ? match[1] : null;
}

function driveEmbedUrl(url: string): string | null {
  const match = url.match(/\/d\/([\w-]+)/) ?? url.match(/[?&]id=([\w-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}

type EmbedCallbacks = {
  onPlay?: (handle: PlayableHandle) => void;
  onEnded?: (handle: PlayableHandle) => void;
  loop?: boolean;
  mediaRef?: (handle: PlayableHandle | null) => void;
};

/**
 * Renders a real, always-present <iframe> immediately — playable and
 * embeddable with zero JS, same baseline as before #86 — then progressively
 * enhances it: the IFrame Player API supports attaching a YT.Player to an
 * *existing* iframe (rather than only creating its own from a placeholder
 * element), the same "attach, don't replace" shape SoundCloud's widget uses
 * below. If the API script never loads (no network, ad blocker, etc.) the
 * iframe still plays fine on its own — pause-coordination/Play All just
 * silently don't apply to it, same as any other unregistered item.
 *
 * The iframe's src is deliberately static (videoId only, never loop) — an
 * earlier version baked `loop` into a `&loop=1&playlist=...` query param,
 * which meant toggling Loop/Play All changed the src and reloaded the
 * iframe out from under the already-attached YT.Player, breaking its
 * postMessage channel (surfaced as YT "stopping responding" to pause
 * coordination). Loop is instead handled entirely in JS, replaying on
 * ENDED, the same shape SoundCloud already uses below. onPlay/onEnded/loop
 * are read from `latest` (updated every render) rather than closed over at
 * effect-creation time, so toggling Loop/Play All after this player has
 * already initialized takes effect immediately instead of being stuck with
 * whatever the values were at mount.
 */
function YouTubeEmbed({ videoId, onPlay, onEnded, loop, mediaRef }: { videoId: string } & EmbedCallbacks) {
  const containerId = useId();
  const latest = useRef({ onPlay, onEnded, loop });
  useEffect(() => {
    latest.current = { onPlay, onEnded, loop };
  });

  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | undefined;

    loadYouTubeIframeApi().then((ytApi) => {
      if (cancelled) return;

      const handle: PlayableHandle = {
        play: () => player?.playVideo(),
        pause: () => player?.pauseVideo(),
      };

      player = new ytApi.Player(containerId, {
        events: {
          onStateChange: (event) => {
            if (event.data === ytApi.PlayerState.PLAYING) {
              latest.current.onPlay?.(handle);
            } else if (event.data === ytApi.PlayerState.ENDED) {
              if (latest.current.loop) handle.play();
              else latest.current.onEnded?.(handle);
            }
          },
        },
      });
      mediaRef?.(handle);
    });

    return () => {
      cancelled = true;
      player?.destroy();
      mediaRef?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- videoId changing would need a full re-mount anyway; onPlay/onEnded/loop are read from `latest` instead
  }, [containerId, videoId]);

  return (
    <iframe
      id={containerId}
      src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
      className="aspect-video w-full rounded"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

/**
 * SoundCloud's Widget API attaches to an iframe this component already
 * renders, rather than creating its own (#86) — the opposite of YouTube
 * above. Same `latest`-ref pattern as YouTubeEmbed, for the same reason:
 * without it, toggling Loop/Play All after this widget already bound its
 * PLAY/FINISH handlers would be stuck with the loop/callback values from
 * whenever the widget first initialized.
 */
function SoundCloudEmbed({ url, onPlay, onEnded, loop, mediaRef }: { url: string } & EmbedCallbacks) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const latest = useRef({ onPlay, onEnded, loop });
  useEffect(() => {
    latest.current = { onPlay, onEnded, loop };
  });

  useEffect(() => {
    let cancelled = false;
    let widget: SCWidget | undefined;

    loadSoundCloudWidgetApi().then(() => {
      if (cancelled || !iframeRef.current || !window.SC) return;

      widget = window.SC.Widget(iframeRef.current);
      const handle: PlayableHandle = {
        play: () => widget?.play(),
        pause: () => widget?.pause(),
      };

      widget.bind(window.SC.Widget.Events.PLAY, () => latest.current.onPlay?.(handle));
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        if (latest.current.loop) handle.play();
        else latest.current.onEnded?.(handle);
      });
      mediaRef?.(handle);
    });

    return () => {
      cancelled = true;
      widget?.unbind(window.SC!.Widget.Events.PLAY);
      widget?.unbind(window.SC!.Widget.Events.FINISH);
      mediaRef?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- url changing would need a full re-mount anyway; onPlay/onEnded/loop are read from `latest` instead
  }, [url]);

  return (
    <iframe
      ref={iframeRef}
      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`}
      className="h-24 w-full rounded"
    />
  );
}

export default function MediaEmbed({
  url,
  kind,
  onPlay,
  onEnded,
  loop,
  mediaRef,
}: {
  url: string;
  kind: MediaKind;
  // Fires when playback starts, for callers that coordinate playback across
  // multiple embeds (#41). Native <audio>/<video> pass their element
  // directly (it already satisfies PlayableHandle); youtube/soundcloud pass
  // a small adapter object wrapping their respective player APIs (#86).
  // drive has no public playback-control API and stays excluded.
  onPlay?: (handle: PlayableHandle) => void;
  // Fires when playback ends, for Play All's auto-advance sequencing (#84).
  onEnded?: (handle: PlayableHandle) => void;
  // Loop the item when it ends (#84) — implemented natively for
  // audio/video, via playerVars for youtube, and by replaying on FINISH
  // for soundcloud (neither embed API has a declarative loop attribute).
  loop?: boolean;
  // Exposes a PlayableHandle so a caller can call .play() on it externally
  // (#84's Play All auto-advance, and Loop's whole-sequence restart).
  mediaRef?: (handle: PlayableHandle | null) => void;
}) {
  switch (kind) {
    case "youtube": {
      const videoId = youtubeVideoId(url);
      if (!videoId) break;
      return <YouTubeEmbed videoId={videoId} onPlay={onPlay} onEnded={onEnded} loop={loop} mediaRef={mediaRef} />;
    }
    case "drive": {
      const embed = driveEmbedUrl(url);
      if (!embed) break;
      return <iframe src={embed} className="aspect-video w-full rounded" allow="autoplay" />;
    }
    case "soundcloud":
      return <SoundCloudEmbed url={url} onPlay={onPlay} onEnded={onEnded} loop={loop} mediaRef={mediaRef} />;
    case "audio":
      return (
        <audio
          ref={mediaRef}
          controls
          loop={loop}
          className="w-full"
          onPlay={(e) => onPlay?.(e.currentTarget)}
          onEnded={(e) => onEnded?.(e.currentTarget)}
        >
          <source src={url} />
        </audio>
      );
    case "video":
      return (
        <video
          ref={mediaRef}
          controls
          loop={loop}
          className="w-full rounded"
          src={url}
          onPlay={(e) => onPlay?.(e.currentTarget)}
          onEnded={(e) => onEnded?.(e.currentTarget)}
        />
      );
    case "direct_url":
    default:
      break;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded border border-ink/20 px-4 py-2 text-sm text-ink hover:bg-ink/5"
    >
      Open link ↗
    </a>
  );
}
