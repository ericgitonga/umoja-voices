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
 * Wires a real YT.Player instance up to the same onPlay/onEnded/mediaRef
 * contract native <audio>/<video> already provide (#86) — YT.Player creates
 * its own iframe in place of the placeholder <div> below, so no hand-authored
 * <iframe src=...> is needed here (unlike the SoundCloud case below).
 */
function YouTubeEmbed({ videoId, onPlay, onEnded, loop, mediaRef }: { videoId: string } & EmbedCallbacks) {
  const containerId = useId();

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
        videoId,
        playerVars: loop ? { loop: 1, playlist: videoId } : undefined,
        events: {
          onStateChange: (event) => {
            if (event.data === ytApi.PlayerState.PLAYING) onPlay?.(handle);
            else if (event.data === ytApi.PlayerState.ENDED) onEnded?.(handle);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- videoId/loop changing would need a full re-mount anyway; callbacks are stable enough in practice for this component's usage
  }, [containerId, videoId]);

  return <div id={containerId} className="aspect-video w-full rounded" />;
}

/**
 * SoundCloud's Widget API attaches to an iframe this component already
 * renders, rather than creating its own (#86) — the opposite of YouTube
 * above.
 */
function SoundCloudEmbed({ url, onPlay, onEnded, loop, mediaRef }: { url: string } & EmbedCallbacks) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

      widget.bind(window.SC.Widget.Events.PLAY, () => onPlay?.(handle));
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        if (loop) handle.play();
        else onEnded?.(handle);
      });
      mediaRef?.(handle);
    });

    return () => {
      cancelled = true;
      mediaRef?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- url/loop changing would need a full re-mount anyway; callbacks are stable enough in practice for this component's usage
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
