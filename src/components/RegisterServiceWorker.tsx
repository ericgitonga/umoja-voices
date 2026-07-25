"use client";

import { useEffect } from "react";

/**
 * Configurator-mode Serwist (#124, see serwist.config.ts) doesn't auto-inject
 * a registration script the way @serwist/next's webpack-plugin mode would —
 * that mode isn't usable here since it doesn't work under Turbopack, this
 * repo's default bundler. Registered directly, not via @serwist/window,
 * since this pass doesn't need update-lifecycle events (a "new version
 * available" prompt), just "the service worker is installed and controlling
 * pages." Skipped outside production: dev builds don't get a real precache
 * manifest (serwist.config.ts / @serwist/next's own default), so there's
 * nothing useful to register locally.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
