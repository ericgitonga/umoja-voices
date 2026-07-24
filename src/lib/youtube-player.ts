/**
 * Loads YouTube's IFrame Player API exactly once per page, however many
 * YouTubeEmbed instances mount — every caller awaits the same promise, so a
 * second embed mounting after the first already triggered the load (or
 * after the API already finished loading) just resolves immediately rather
 * than re-injecting the script.
 *
 * The script is injected via document.createElement (#86) rather than a
 * static <script src> tag, which is what lets it load under this app's
 * nonce + 'strict-dynamic' CSP (src/proxy.ts) with no config change: code
 * already trusted by the nonce can inject further scripts that are
 * automatically trusted too, regardless of the injected script's own
 * origin or lack of a nonce.
 */

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

export interface YTApi {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      playerVars?: Record<string, unknown>;
      events?: {
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YTApi> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiPromise;
}
