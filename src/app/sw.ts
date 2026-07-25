// This file executes in the ServiceWorkerGlobalScope, whose ambient types
// come from TypeScript's "webworker" lib. This project's tsconfig.json uses
// "dom" (needed for every other file) and TS doesn't allow both in one
// program (they declare conflicting globals), so this file is excluded from
// the project-wide `tsc --noEmit` check in tsconfig.json instead — it's
// bundled separately by `serwist build` (see serwist.config.ts), not by tsc.
// `self`/`__SW_MANIFEST` are therefore typed `any` below rather than as
// `ServiceWorkerGlobalScope`, whose type doesn't exist without that lib.
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
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
    // (#124) — all admin-editable, force-dynamic/live-Prisma pages.
    // network-first, not stale-while-revalidate: SWR returns the cached
    // response immediately regardless of whether the network is actually
    // reachable, which broke CI's own e2e suite (#124 dev notes) — an admin
    // adds a media item, the page re-fetches via Next's RSC refresh, and SWR
    // served the *pre*-mutation cached copy since a background revalidation
    // fetch updates the cache for next time, not the in-flight response.
    // network-first tries the network first (identical to today's behavior
    // whenever online) and only falls back to cache on a genuine network
    // failure — exactly the offline-while-touring case, with no staleness
    // risk during normal same-session use. Mirrors @serwist/next's own
    // defaultCache, which uses network-first for every page/RSC route below.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && /\/songs\/[^/]+\/(lyrics|sheet-music|media)$/.test(url.pathname),
      handler: new NetworkFirst({
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
