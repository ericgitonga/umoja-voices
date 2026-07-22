import type { MediaKind } from "@/lib/constants";

function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function driveEmbedUrl(url: string): string | null {
  const match = url.match(/\/d\/([\w-]+)/) ?? url.match(/[?&]id=([\w-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}

export default function MediaEmbed({
  url,
  kind,
  onPlay,
}: {
  url: string;
  kind: MediaKind;
  // Native <audio>/<video> "play" event, for callers that coordinate
  // playback across multiple embeds (#41) — iframe-based kinds
  // (youtube/drive/soundcloud) can't be hooked into cross-origin, so this
  // only ever fires for "audio"/"video".
  onPlay?: (el: HTMLMediaElement) => void;
}) {
  switch (kind) {
    case "youtube": {
      const embed = youtubeEmbedUrl(url);
      if (!embed) break;
      return (
        <iframe
          src={embed}
          className="aspect-video w-full rounded"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    case "drive": {
      const embed = driveEmbedUrl(url);
      if (!embed) break;
      return <iframe src={embed} className="aspect-video w-full rounded" allow="autoplay" />;
    }
    case "soundcloud":
      return (
        <iframe
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`}
          className="h-24 w-full rounded"
        />
      );
    case "audio":
      return (
        <audio controls className="w-full" onPlay={(e) => onPlay?.(e.currentTarget)}>
          <source src={url} />
        </audio>
      );
    case "video":
      return (
        <video
          controls
          className="w-full rounded"
          src={url}
          onPlay={(e) => onPlay?.(e.currentTarget)}
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
