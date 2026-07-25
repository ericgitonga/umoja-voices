"use client";

import { useState } from "react";

/**
 * Replaces a raw `<a href={fileUrl} target="_blank">` to the Supabase
 * Storage public URL (#124). A service worker can only intercept requests it
 * controls — a top-level navigation to a different origin in a new tab isn't
 * one of those, so the PDF could never actually be cached for offline use.
 * Fetching it here instead, from the page's own JS, makes it an interceptable
 * `fetch` (see sw.ts's "song-storage-media" cache-first route) before
 * handing the result to the browser as a blob: URL.
 */
export default function SheetMusicViewer({ fileUrl, label }: { fileUrl: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function open() {
    setStatus("loading");
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={open}
        disabled={status === "loading"}
        className="text-left text-sm font-medium text-ink hover:underline disabled:opacity-60"
      >
        {status === "loading" ? "Opening…" : label}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-600">
          Couldn&apos;t open this file — available offline only after it&apos;s been opened once while online.
        </p>
      )}
    </div>
  );
}
