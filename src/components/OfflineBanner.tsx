"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

function getServerSnapshot() {
  // The server has no navigator/network state — assume online, corrected on
  // the client immediately after hydration if that's wrong.
  return false;
}

/**
 * Surfaces the offline-caching tradeoff from #124 explicitly, rather than
 * silently serving a stale cached copy with no signal: song content is
 * admin-editable, so a cached lyrics/media/sheet-music page can be out of
 * date until the device reconnects. Shown only while actually offline —
 * stale-while-revalidate (sw.ts) already self-heals the cache to the latest
 * version on every visit made while online, so there's no ambiguity then.
 */
export default function OfflineBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) return null;

  return (
    <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
      You&apos;re offline — showing the last cached version of this page.
    </p>
  );
}
