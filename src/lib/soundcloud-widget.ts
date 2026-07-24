/**
 * Loads SoundCloud's Widget API exactly once per page — same singleton
 * pattern as youtube-player.ts, and the same reasoning for why a
 * document.createElement-injected script works under this app's
 * nonce + 'strict-dynamic' CSP with no config change.
 *
 * Unlike YouTube's IFrame Player API (which creates its own iframe),
 * SoundCloud's Widget API attaches to an iframe this app already renders
 * (src="https://w.soundcloud.com/player/?url=...") via SC.Widget(iframeEl).
 */

export interface SCWidget {
  play(): void;
  pause(): void;
  bind(eventName: string, callback: () => void): void;
  unbind(eventName: string): void;
}

declare global {
  interface Window {
    SC?: {
      Widget: {
        (iframe: HTMLIFrameElement): SCWidget;
        Events: { PLAY: string; FINISH: string };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadSoundCloudWidgetApi(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    if (window.SC?.Widget) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return scriptPromise;
}
