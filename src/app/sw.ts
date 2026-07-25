// This file executes in the ServiceWorkerGlobalScope, whose ambient types
// come from TypeScript's "webworker" lib. This project's tsconfig.json uses
// "dom" (needed for every other file) and TS doesn't allow both in one
// program (they declare conflicting globals), so this file is excluded from
// the project-wide `tsc --noEmit` check in tsconfig.json instead — it's
// bundled separately by `serwist build` (see serwist.config.ts), not by tsc.
// `self`/`__SW_MANIFEST` are therefore typed `any` below rather than as
// `ServiceWorkerGlobalScope`, whose type doesn't exist without that lib.
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";
import { defaultCache } from "@serwist/next/worker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see file-header comment
const sw: any = self;

const serwist = new Serwist({
  precacheEntries: sw.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // The three song sub-pages that matter for offline access while touring
    // (#124) — all admin-editable, force-dynamic/live-Prisma pages, so
    // stale-while-revalidate serves the last-cached copy instantly (works
    // offline) while refreshing it in the background on every visit made
    // while online, rather than committing to either a pure cache-first
    // (never re-checks) or network-first (useless offline) strategy.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && /\/songs\/[^/]+\/(lyrics|sheet-music|media)$/.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "song-subpages",
      }),
    },
    // Sheet-music PDFs, audio, and video served from Supabase Storage's
    // public URL (a different origin than this app) — cache-first, since
    // uploaded media files rarely change once attached to a song, and these
    // are the actual files a touring chorister needs available with no
    // connection. Only reachable via the in-page fetch+blob viewer
    // (SheetMusicViewer.tsx) now, not a raw cross-origin <a target="_blank">
    // — a service worker can't intercept the latter.
    {
      matcher: ({ url }) =>
        url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL && url.pathname.includes("/storage/v1/object/"),
      handler: new CacheFirst({
        cacheName: "song-storage-media",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 90 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
