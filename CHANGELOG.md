# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org) (pre-1.0, see `SKILL.md`).

## [0.28.2] - 2026-07-21

### Fixed

- **Uploads over ~4.5MB still failed on production after 0.28.1** (closes #63): manual
  testing found "Something went wrong" on a plain 6MB file, confirmed live as a `413` on
  the POST request. Root cause: Vercel Serverless Functions enforce a hard, non-configurable
  4.5MB request body limit (`413 FUNCTION_PAYLOAD_TOO_LARGE`), completely separate from and
  in front of `next.config.ts`'s `experimental.serverActions.bodySizeLimit`/
  `proxyClientMaxBodySize` (both already at 22MB from 0.28.1 — irrelevant here, since Vercel
  rejects the request before it ever reaches Next.js). 0.28.1's E2E test never caught this
  because it runs the app via `next start` directly on the GitHub Actions runner, never
  through Vercel's actual routing layer where this limit applies. Affected every upload path
  that sent a raw `File` through a Server Action body: video (`AddMediaForm`, `AboutVideoForm`,
  `SongEditor`), audio (`AddMediaForm`, `SongEditor`), and sheet-music/PDF
  (`AddSheetMusicForm`) — the app's own 20MB per-file cap was never actually reachable on a
  real deployment. Fixed via Vercel's own recommended pattern for this exact problem: file
  bytes now go straight from the browser to Supabase Storage using a signed upload URL
  (`createSignedUploadUrl`/`uploadToSignedUrl`, confirmed to need zero new RLS policies —
  the signed token itself is the auth mechanism), bypassing Vercel Functions entirely; a tiny
  follow-up Server Action then just records the resulting URL in Postgres. Each storage
  module (`src/lib/video-storage.ts`, `src/lib/storage.ts`, `src/lib/sheet-music-storage.ts`)
  now mints a ticket (`createXUploadTicket`) instead of receiving the file directly; a new
  `src/lib/upload-client.ts` does the direct browser upload, reused by all four forms.
  Audio's pre-upload binary content sniff (catching a mislabeled AAC-as-.mp3 file) moved to a
  post-upload check (`verifyUploadedAudioFile`, a ranged fetch of the first 12 bytes back from
  Storage) since the file's bytes no longer reach the server before the upload happens — same
  detection, same rejection-and-delete behavior, just after the direct upload instead of
  before. Also fixed `AddSheetMusicForm.tsx` never using `describeUploadFailure` for a thrown
  error like the other three upload forms already did, noticed while rewriting its handler
  anyway.

## [0.28.1] - 2026-07-21

### Fixed

- **Video (and any >10MB) uploads failing with "Something went wrong"** (closes #58): root-caused
  to `src/proxy.ts` (this app's global middleware, broadened to every route for #17's per-request
  CSP nonce) — Next.js clones and buffers every request body a proxy sees, capped at **10MB by
  default**, separately from and in front of `experimental.serverActions.bodySizeLimit` (already
  raised to 22MB for #36). Any upload over 10MB — routinely true for video, occasionally for
  audio/sheet-music, all nominally allowed up to this app's 20MB per-file cap — got silently
  truncated by the proxy (no error, per Next's own documented behavior) and the Server Action
  then failed parsing the now-broken multipart body (`Error: Unexpected end of form`), surfacing
  to the user as a generic, unhelpful message. Confirmed directly: a 14MB test upload reproduced
  the bug locally on a fast, unthrottled connection with zero packet loss — this was a body-size
  ceiling, not a network-flakiness issue, ruling out the "slow mobile connection" hypothesis the
  issue itself raised before the real cause was found. Fixed by setting
  `experimental.proxyClientMaxBodySize: "22mb"` in `next.config.ts`, matching the existing
  Server Actions limit. Also improved the client-side error message for the separate, still-real
  case of an actual dropped connection mid-upload (`src/lib/upload-error.ts`): distinguishes a
  network-layer failure (`TypeError: Failed to fetch` and equivalents) from any other thrown
  error and gives the user specific, actionable guidance instead of a generic message — wired
  into `AddMediaForm`, `AboutVideoForm`, and `SongEditor`'s save handler. Added
  `e2e/test_video_upload.py` as a regression test — an 11MB fake file written to a real temp
  path (video uploads aren't content-sniffed, so no real video/ffmpeg dependency is needed for
  this; a real file rather than an in-memory buffer avoids CDP base64-transfer overhead in CI).
  This regression test itself then surfaced two further, unrelated problems before it could go
  green: the Preview environment's `SUPABASE_SECRET_KEY` had been stored as a Vercel "sensitive"
  variable, which is unreadable by `vercel env pull` (this repo's CI setup step) and was
  silently resolving to the literal string `"[SENSITIVE]"`, so every Storage upload failed auth
  in under a second (fixed by re-adding the key as non-sensitive); and the test's own
  `_wait_for_outcome()` only recognized one specific error string as a failure signal, so that
  near-instant auth failure was invisible to it and it just polled the full timeout instead
  (fixed by anchoring on the error paragraph's own CSS class so any inline form error is caught
  generically, and raising immediately with the real message instead of returning silently).
  Also fixed `.github/workflows/e2e.yml` to actually capture the app server's own console
  output (redirected to a file, printed unconditionally at the end) — GitHub Actions had been
  silently dropping it once the step that backgrounded `npm run start` exited, which is what
  made the real error invisible during the investigation in the first place.

## [0.28.0] - 2026-07-21

### Added

- **Audit history / broadened data-change trail** (closes #49): originally filed as an
  explore-and-scope issue, implemented in full at the app owner's later request. Broadens #50's
  narrow `ActivityLog` (login + song create/delete + member role change) into the app's real
  data-change trail rather than adding a second, near-duplicate table — the two issues were
  explicitly framed as able to share one persistence layer if picked up together. Newly tracked:
  song edits (`song_update`), member status changes/deactivation (`member_status_change`) and
  deletion (`member_delete`) — neither was logged anywhere before this — plus every logistics
  create/delete (trip, deadline, itinerary item, practice session; there's no logistics *edit*
  path today, only create/delete). Every entry now also records the actor's IP address and raw
  User-Agent (`ActivityLog.ipAddress`/`.userAgent`, both nullable so pre-#49 rows stay valid) —
  captured inside `logActivity()` itself via `next/headers`, so every existing call site (login,
  song create/delete, member role change) started recording them with no changes of its own
  needed. Browser/OS are parsed from the stored User-Agent at render time
  (`src/lib/user-agent.ts`, a small dependency-free regex parser) rather than stored as separate
  columns. `/admin/activity` now shows the affected entity, IP, browser/OS, and formats every
  timestamp in East Africa Time (`src/lib/format-eat.ts`, per the issue's explicit request) —
  Vercel's Node runtime defaults to UTC, so this needed an explicit timezone rather than relying
  on the server's own clock. Migration applied to both the Preview/dev and Production Supabase
  projects. Added `e2e/test_audit_history.py` covering the newly-tracked actions and the IP/
  browser-context fields.

## [0.27.0] - 2026-07-21

### Added

- **Direct video upload** (closes #55): follow-up to #43 — the About page linked out to White
  Ribbon Alliance Kenya's Instagram reel rather than embedding it, since Instagram's embed
  widget needs an external `embed.js` this app's nonce-based CSP doesn't allow. Rather than
  pursue the embed further, videos are now uploaded directly (all featured videos are under
  20MB; larger ones get ffmpeg-compressed first), mirroring the existing audio (#36) and
  sheet-music (#38) direct-upload pattern exactly: a new `song-video` Storage bucket
  (`src/lib/video-storage.ts`, created via `npm run storage:setup` on both the Preview/dev and
  Production Supabase projects), MIME/extension/size validation, cleanup-on-delete. `AddAudioForm`
  generalized to `AddMediaForm` (audio-or-video upload, alongside the existing paste-URL tab) for
  the song-media flow; `SongEditor`'s per-item upload also now accepts video. Uploaded files are
  routed to the audio or video bucket by MIME type at the Server Action layer
  (`uploadMediaFile`/`isOwnMediaUrl`/`deleteMediaFile` in `song-actions.ts`).
  Added a singleton `AboutPageVideo` model (migration applied to both Supabase projects) for the
  About page's single featured video — admin-only upload/replace/remove via a new
  `AboutVideoForm`/`about-actions.ts`, rendered through the existing `MediaEmbed`. The Instagram
  link-out stays as a reference to the original post. The admin Storage page now also accounts
  for video files (new "Video" `StorageFileList` kind), and `/about` was added to the signed-in
  nav (it was public-nav-only before, so logged-in members had no way to reach it).

## [0.26.0] - 2026-07-21

### Added

- **Minimal activity logging** (closes #50): explicitly exploratory — a narrow proof-of-concept
  slice (login events + a handful of high-value admin mutations), not a full audit trail (see
  #49 for that separate, broader exploration). Checked Supabase's own Auth/Postgres logging
  first per the issue's own suggestion — its dashboard Logs Explorer isn't queryable from within
  the app and has short free-tier retention, so it's not a substitute for an in-app, durable
  record. Added an `ActivityLog` Prisma model (migration applied to both the Preview/dev and
  Production Supabase projects, per #52's dual-project workflow) — `userLabel` is a snapshot of
  the actor's name/email at the time of the action, not a live FK to `User`, so the log stays
  meaningful even after a user is later deleted. Wired into `login()`, `createSong()`,
  `deleteSong()`, and `updateMemberRole()`. New admin-only `/admin/activity` page (linked from
  `Nav`) lists the most recent 100 entries — no pagination/filtering for this pass. Logging is
  best-effort: a failure never blocks the action it's describing.

### Testing

- Added `e2e/test_activity_log.py` (3 specs, each cleaning up after itself since the suite runs
  against a shared Preview database). Discovered along the way that the growing suite's
  "every spec logs in fresh" pattern was tripping the app's own login rate limiter (5 attempts
  per email per 15 minutes, #20) on its own, once past ~5 admin logins in one run — a real
  security control working as intended, not a bug. Added `admin_page()`/`chorister_page()` to
  `e2e/_common.py`: a cached, reused authenticated session shared across every spec in a run
  that doesn't need to exercise the login flow itself, cutting real admin logins per full suite
  run from 6 to 2.

## [0.25.0] - 2026-07-21

### Added

- **Public About page + genuinely public Links page** (closes #43): the issue's own premise
  ("no middleware, auth enforced ad hoc per page") turned out stale — `src/proxy.ts` (this
  project's actual middleware) already gated `/links` via `PROTECTED_PREFIXES`, redirecting
  anonymous visitors to `/login` before the page's own code ever ran. Removed `/links` from that
  list (and never added the new `/about`) so both are truly reachable without signing in — each
  page's own `getSession()` call still conditionally hides admin-only controls, it just no longer
  gates the page itself. Added `src/app/about/page.tsx`: starter copy about the choir's 2026
  Portugal & Germany tour, joint concerts with host-nation choirs, and ticket sales supporting
  White Ribbon Alliance Kenya (mission/focus areas sourced from whiteribbonalliancekenya.org) —
  their Instagram reel is linked out to rather than embedded (Instagram's official embed needs an
  external `embed.js` script this app's strict nonce-based CSP doesn't allow; a bare-iframe
  embed may be possible without that — left for a follow-up issue). `MediaEmbed`'s existing
  YouTube-embed pattern is wired in and ready for a real video link once one exists.

### Changed

- **`Nav` shows a minimal public nav (About, Links, Sign in) instead of nothing at all when
  logged out** — previously returned `null` entirely for anonymous visitors, so #43's public
  pages had no way to be discovered without knowing the URL.

### Testing

- Added `e2e/test_public_pages.py` (3 new specs): `/about` and `/links` load without redirecting
  to `/login`, and the public nav shows the expected links. Full 8-spec suite verified passing
  locally against the Preview database before opening the PR.

## [0.24.1] - 2026-07-21

### Changed

- **Adopted a branch-per-issue workflow**, now that #44's E2E gate and #52's environment
  isolation make it safe and fast to do for every issue, not just large ones. Documented in
  `SKILL.md`'s new "Branch-per-issue workflow" section: branch off `main` per issue, open a PR
  with `closes #N`, wait for the `E2E (Preview)` check to go green, merge only then. No more
  pushing straight to `main`.

## [0.24.0] - 2026-07-20

### Added

- **Golden-path E2E smoke suite, gated in CI before merge to `main`** (closes #44): explicitly a
  spike/exploration issue whose scope was decided on pickup, now unblocked by #52's environment
  isolation. Added `e2e/` — login/role-gating and song library/detail/media coverage, written in
  Python against the `playwright` package (already present in the `ds` conda env with browsers
  pre-cached) rather than `@playwright/test`, matching this project's existing convention of
  using `ds` for Python tooling instead of a parallel npm toolchain. No `pytest`/`pytest-playwright`
  available either, so specs are plain `assert`-based scripts discovered and run by `e2e/run.py`.
  `.github/workflows/e2e.yml` runs the suite on every PR against `main`, against a server built
  and started in the CI runner using the Preview/Development Supabase project from #52 (never
  production) — requires a `VERCEL_TOKEN` repository secret, generated manually by the app owner
  since minting one via `vercel tokens add` from this session was blocked (403 — a deliberate
  scope restriction on the Vercel Claude plugin's OAuth grant, not something to route around).
  Verified the whole suite passing locally against the real Preview database before considering
  this done, and verified the CI token itself by pulling real Preview env vars with it.
  Deliberately out of scope for this pass (see `SKILL.md`'s new E2E section): automatic
  Preview-to-Production promotion, and golden-path coverage beyond what's listed above.

## [0.23.0] - 2026-07-20

### Added

- **Environment isolation between Production and Preview/local dev** (closes #52): Preview
  deployments and local development previously hit the exact same live production Supabase
  project as real users — confirmed directly, every `.env`/`.env.local`-driven Vercel env var
  (`POSTGRES_*`, `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`) was scoped to Production, Preview, and
  Development all at once. Repurposed a second, previously-unused Supabase project (created
  directly on supabase.com before the Vercel Marketplace integration provisioned the current
  production one, and sitting empty since) as a dedicated Preview/Development database: applied
  all existing `prisma/migrations` to it, created its own `song-audio`/`song-sheet-music` Storage
  buckets, and seeded it via the normal `prisma/seed.ts` (admin + Demo Chorister + placeholder
  song/trip — no real data). Split the five Vercel env vars this codebase actually reads
  (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) so Production keeps its original
  value while Preview and Development point at the new project — verified with a real login
  round-trip (Supabase Auth + Prisma) against it before touching anything else. A dedicated
  `app_owner` Postgres role (not `postgres`) owns the new project's schema, since Supabase blocks
  resetting/altering the `postgres` role's password via API. `README.md`/`SKILL.md`/
  `.env.example` updated with the new dual-project workflow and the migration-sync process this
  introduces (apply new migrations to both projects going forward).

### Security

- Confirmed no Production Vercel env var was altered in the process: every change was verified
  against `production` scope immediately before and after. One brief, harmless mid-flight mistake
  (a naive `vercel env rm NAME preview` turned out to delete the variable from *every*
  environment sharing that record, momentarily clearing `NEXT_PUBLIC_SUPABASE_URL` in Production
  too) was caught immediately via the same verification habit and restored within seconds — a
  live production deployment's already-built Lambda isn't affected by an env var change until its
  next build, so this had no real-world impact, but the safe pattern (`vercel env add <name>
  <environment> --force`, never `rm`, when splitting a shared multi-environment value) is now
  documented in `SKILL.md` so it isn't attempted again.

## [0.22.1] - 2026-07-20

### Added

- **Colored left-border bar per voice-part section on the Media page** (closes #40, follow-up):
  reopened after the initial pass — each section on `/songs/[id]/media` now has a `border-l-4`
  bar spanning its full height (badge, heading, and every media card underneath), colored to
  match that section's voice color from `VOICE_TAG_COLOR`'s new `border` variant, matching the
  `border-l-4 border-*` card style already used elsewhere in the app (e.g. the song detail
  page's Media/Sheet Music/Lyrics cards).

## [0.22.0] - 2026-07-20

### Added

- **Pastel color-coded voice-part badges/tags, consistent app-wide** (closes #40): added
  `VOICE_TAG_COLOR` to `src/lib/constants.ts` — a shared `{ pill, solid }` Tailwind class map
  keyed by `VoiceTag` (S-red, A-green, T-yellow, B-blue, SATB/All-orange). Replaces the flat gray
  `bg-ink/*` pills at all three render sites: the media page's per-`SongSection` group badge
  (`songs/[id]/media/page.tsx`, mapped through `SONG_PART_TO_VOICE_TAG` since that page keys off
  `SONG_PART_OPTIONS` not `VOICE_TAGS`), the song detail page's `partsPresent` badges
  (`songs/[id]/page.tsx`), and `LyricsViewer`'s per-section voice tags plus its filter tabs and
  "ALL"/active-filter indicator (using `solid` for the selected state, `pill` otherwise). Media
  grouping per voice section already existed via `SongSection`/`part` — confirmed and left as-is
  per the issue's scope, only the badge coloring changed.

## [0.21.0] - 2026-07-20

### Added

- **`arranger` as its own Song field, distinct from `composer`** (closes #39): the song
  create/edit forms previously had two credit boxes (Words/lyricist, Music/composer), with
  "Music" implicitly doubling as "who arranged this" whenever the two differed. Added a new
  `arranger` column (`prisma/schema.prisma`, migration `20260720150645_add_song_arranger`,
  applied directly to the live Supabase DB per this project's single-database workflow) and a
  fourth form box, so all three credit roles are captured separately.

### Changed

- **Song credit boxes relabeled and read-only views split onto separate lines** (closes #39):
  `admin/songs/new/page.tsx` and `SongEditor.tsx` now show four boxes — Title, Writer, Composer,
  Arranger — replacing the old "Words (lyricist)"/"Music (composer)" labels. The three read-only
  display locations (`songs/page.tsx`, `songs/[id]/page.tsx`, `songs/[id]/lyrics/page.tsx`), which
  all concatenated Words/Music onto one space-joined line, now render Writer/Composer/Arranger as
  separate lines, each shown only when present.

## [0.20.1] - 2026-07-20

### Fixed

- **Audio upload stuck at "Adding…" / uploads unplayable files** (closes #51): two independent
  bugs found investigating a real report. (1) Files downloaded from YouTube-style adaptive
  streaming (DASH) sources are often AAC audio in an MP4 container despite a `.mp3` extension —
  `uploadAudioFile` only checked the browser-reported `File.type` and filename extension, both
  extension-derived and easily fooled (confirmed: Chromium reports `audio/mpeg` identically for
  a real MP3 and for a mislabeled AAC/MP4 file), so a mismatched file uploaded "successfully"
  and only failed at actual playback. Added `sniffAudioFormat()` to `src/lib/storage.ts`,
  reading the file's first 12 bytes to identify its real container/frame format and reject a
  mismatch with a specific, actionable error (`m4a` legitimately is an MP4 container, so this
  only catches a genuine mismatch, not legitimate `.m4a` uploads). (2) `AddAudioForm.handleSubmit`
  had no `try/catch` around its Server Action call — any thrown error (a network drop, or a
  transient Supabase/Postgres connectivity hiccup, observed happening live against this project
  multiple times) left the button stuck on "Adding…" forever with no error shown and no way to
  retry short of reloading. Reproduced directly with a forced-network-failure test matching the
  reported screenshot exactly. The same missing-try/catch pattern existed in 6 other places
  (`AddSheetMusicForm`, `SongEditor.handleSave`, `ReplaceLyricsEditor.handleSave`,
  `RemoveMediaButton`, `RemoveSheetMusicButton`, `DeleteSongButton`) — all now wrapped
  consistently, always resetting the loading state and surfacing a clear error. Also fixed a
  related cosmetic bug in both upload forms: the native file input never visually cleared after
  a successful submit (can't be reset via React state alone), fixed via a ref-based
  `.value = ""` reset.

## [0.20.0] - 2026-07-20

### Added

- **Sheet Music (PDF) upload for songs** (closes #38): a new `SongSheetMusic` model (flat
  per-song list, not grouped by voice part like `SongMedia`/`SongSection` — sheet music is
  typically a full score or a handful of parts, not per-voice recordings) plus a third
  "Sheet Music" card on the song detail page alongside Media and Lyrics. PDFs upload to a new
  `song-sheet-music` Supabase Storage bucket (`src/lib/sheet-music-storage.ts`, mirroring the
  #36 audio-upload pattern: admin-client-only, server-side MIME/extension/size validation,
  20MB per-file cap, storage cleanup on delete) via a new `/songs/[id]/sheet-music` page with
  admin-only add/remove.
- **Sortable, combined admin Storage page**: extended to show both audio and sheet-music usage
  under one shared quota bar (Supabase's 1GB free tier is project-wide, not per-bucket), with
  each file tagged by kind. Added a new `StorageFileList` client component with sort controls
  (File name / Type / Size, click to toggle ascending/descending) — requested directly by the
  app owner while this issue was in progress, since it touched the same page. #42's pagination
  and page-size-selector work for this same page is unrelated and still unstarted.

### Fixed

- **Breadcrumb on admin song edit page** (closes #37): after creating a song, `createSong`
  redirects straight to `/admin/songs/{id}/edit` with no way back to the song library except
  the top-nav "Songs" link (which drops you at the library root) or the browser back button.
  Added the shared `Breadcrumb` component (already used on the song detail and media pages) to
  `src/app/admin/songs/[id]/edit/page.tsx`, showing "Songs / {title}" with "Songs" linking to
  `/songs`.
- Verified live against the real Supabase-backed dev environment: logged in as the seeded admin
  via a non-destructive `magiclink` (not `recovery`, so it doesn't touch the real password),
  confirmed the breadcrumb renders correctly on `/admin/songs/{id}/edit`, and clicked it through
  to `/songs` successfully, with zero console errors.

## [0.19.0] - 2026-07-20

### Changed

- **Distributed rate limiter** (closes #20): replaced the in-memory `Map` in `src/lib/rate-limit.ts`
  with a `RateLimitBucket` table in Supabase Postgres (new migration
  `20260720115152_add_rate_limit_bucket`), reviewed and chosen over Upstash Redis (the issue's
  own suggested example) — reuses infrastructure already provisioned rather than adding a new
  vendor, appropriate at this app's traffic scale. The increment-or-reset logic runs as a single
  atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` so concurrent requests for the same
  key — from different serverless instances, the exact gap this issue existed to close — can't
  race each other into an inflated count. `checkRateLimit`/`rateLimitResetMinutes` are now async;
  all 4 call sites (login, forgot-password, invite, and the v0.18.0 admin reset-link tool) were
  updated to `Promise.all` both counter checks concurrently rather than serializing them, and
  — critically — without short-circuiting: `await a() || await b()` would skip evaluating `b()`
  entirely if `a()` failed, silently breaking the "always tick both counters" property the old
  code relied on comments alone to preserve.
- Verified the distributed property directly: four separate `tsx` process invocations (no
  shared memory between them, simulating separate serverless instances) hitting the same
  rate-limit key correctly accumulated a shared count of 1→4 against the live Supabase project,
  with the 4th correctly blocked — the old in-memory version would have given each process its
  own independent counter starting at 1. Also verified end-to-end through the real login flow
  (5 attempts allowed, 6th and 7th blocked) with zero console errors.

## [0.18.1] - 2026-07-20

### Changed

- **Nonce-based CSP** (closes #17): replaced the `'unsafe-inline'` stand-in for `script-src`/
  `style-src` with a per-request nonce, generated in `src/proxy.ts` and threaded via the
  documented Next.js pattern (`x-nonce` request header + `Content-Security-Policy` response
  header on every response). CSP generation moved out of `next.config.ts`'s static `headers()`
  (which can't vary per request) into `proxy.ts`. Production now ships
  `script-src 'self' 'nonce-*' 'strict-dynamic'` and `style-src 'self' 'nonce-*'` with no
  `'unsafe-inline'`/`'unsafe-eval'` (dev mode keeps both, per Next's own documented dev/prod
  split — Turbopack Fast Refresh and React's stack-trace reconstruction both need them).
  `proxy.ts`'s matcher was broadened from the five auth-gated route prefixes to effectively
  every page (excluding `api`/`_next/static`/`_next/image`/`favicon.ico`) — a fresh nonce is
  needed on every page render, not just protected ones, or public pages (login,
  forgot-password, accept-invite, `/auth/confirm`, the root page) would ship with no CSP at all
  once the static header was removed. The Supabase auth/role check itself still only runs for
  the original protected prefixes — the broadened matcher only adds cheap nonce/header work to
  public pages, not an extra auth check.
- Fixed a real violation this surfaced: `admin/storage/page.tsx`'s progress-bar `style={{width}}`
  is an inline style *attribute*, which nonces don't cover (only `<style>`/`<script>` elements
  get Next's automatic nonce tagging). Replaced with a nonced `<style>` tag (nonce read via
  `headers()` in the Server Component) targeting a CSS class, rather than a React inline style
  prop.
- Verified with isolated-browser-context checks (no shared console listeners, to avoid a
  cross-page contamination bug hit while testing) across every page type in a genuine
  **production** build (`npm run start`, not `npm run dev` — dev mode's relaxed CSP wouldn't
  have exercised the real restriction): zero CSP violations, unauthenticated redirect-to-login
  and non-admin redirect-to-`/songs` both still correct, all routes still dynamically rendered
  (a hard requirement for nonce-based CSP — confirmed unchanged via the build output).

## [0.18.0] - 2026-07-20

### Fixed

- **Retuned the `requestPasswordReset` timing-safety mitigation** (closes #18): the fixed 80ms
  delay only padded the "account doesn't exist" branch, and never actually tracked real
  Postgres/Supabase latency — measured directly against the live Supabase project, the real gap
  was 250ms–1000ms (account-exists path: ~520–1250ms via `resetPasswordForEmail`;
  account-doesn't-exist path: ~250–350ms steady-state via a Prisma lookup alone), not 80ms. Now
  pads *total elapsed time* up to a fixed 1400ms target regardless of which branch ran, rather
  than sleeping a fixed amount only on one side — closes the gap to ~10ms in browser-verified
  testing, down from 250–1000ms.
- **Fixed dead code in `forgot-password/page.tsx`**: it destructured `resetLink`/`emailSent`
  from `requestPasswordReset`, which has returned only `{}` since the v0.15.0 Supabase Auth
  migration — both were always `undefined`/`false`. Combined with password-reset email being
  fully blocked on #34, this meant the forgot-password flow was a silent dead end in production
  with no way to actually reset a password. Removed the dead destructuring; the page now
  correctly shows the same generic message regardless of outcome, as designed.

### Added

- **Admin-mediated password-reset link tool** (Members page): a "Reset link" button per active
  member generates a Supabase recovery link (`admin.generateLink({type: "recovery"})` +
  `hashed_token`, mirroring the invite flow's link construction) and shows it on-screen for
  manual sharing — `generateMemberResetLink` in `member-actions.ts`, admin-gated and rate-limited
  the same way `inviteMember` is. This is deliberately **not** on the anonymous
  `/forgot-password` page: showing a link there only when an account exists would leak account
  existence outright on the first request — a worse, immediate content-based side-channel than
  the timing one #18 exists to close. The admin-gated version is safe because the admin already
  knows which members exist (they're looking at the member list) — same reasoning as invite's
  existing "a member with that email already exists" check.
- `.env.local`: added the missing `APP_URL` (documented in `.env.example` but never actually set
  locally) — without it, `appBaseUrl()`'s fallback chain picked up `.env`'s `NEXTAUTH_URL`, which
  is permanently the literal string `"[SENSITIVE]"` (a `vercel env pull` redaction artifact, not
  a real value — see `SKILL.md`'s gotchas), silently producing broken invite/reset links in local
  dev only. Confirmed working end-to-end (generated link → followed anonymously → password
  actually updated) only after this fix; not a production issue since Vercel's own stored env
  vars aren't affected by this local-file redaction bug.

## [0.17.1] - 2026-07-20

### Changed

- **Merged `umoja.pdf` and `extras/design_process.pdf` into one living technical document**:
  `extras/umoja_technical_document.md` (source, gitignored) rendered to
  `extras/umoja_technical_document.pdf` via the `topdf` skill, replacing a bespoke ReportLab
  generator script. The two source files had drifted apart — `design_process.pdf` was already
  current through v0.16.0, while `umoja.pdf` was stuck at v0.13.3 and still described the
  pre-Supabase-Auth-migration NextAuth flow and said audio upload was out of scope (false as of
  #36). The merge brought everything to v0.17.0-current in the process: updated data model
  (`authUserId`, retired `Invite`/`PasswordResetToken` tables), current invite/reset flow, the
  new Storage/`/admin/storage` sections, an updated route map and tech stack table, and an
  extended cost model (140–209hr range, up from 128–192hr, for the #36 work).
  `extras/generate_design_pdf.py` is deleted outright as a result — dead code now that its
  output no longer exists. `SKILL.md` and `README.md` updated to reference the new document.
- Going forward, this document is updated with each issue tackled, not regenerated from scratch
  — see `SKILL.md`'s "Data handling rules" section.

## [0.17.0] - 2026-07-20

### Added

- **Direct audio-file upload to Supabase Storage** (closes #36): `AddAudioForm` (Media page's
  quick-add) and `SongEditor`'s per-section media rows both get a Paste-URL / Upload-file
  toggle. Uploads go through a new public `song-audio` Storage bucket (created via
  `npm run storage:setup` / `scripts/create-storage-bucket.ts`, scriptable rather than a manual
  dashboard step), validated server-side (MIME type, extension against the existing
  `detectMediaKind` audio allowlist, 20MB app-level cap below Supabase's 50MB hard limit) and
  uploaded via the admin/service-role client (`src/lib/storage.ts`) — never from the client,
  consistent with this app's existing Supabase access pattern. No schema change: an uploaded
  file's public Storage URL slots into `SongMedia.mediaUrl`/`mediaKind` exactly like a pasted
  link. Video stays link-only, per the app owner's explicit choice.
- **Storage cleanup on delete**: `removeSongMedia` and `updateSongFull`'s wholesale
  section/media replace both now delete the underlying Storage object when a removed
  `mediaUrl` matches our own bucket's public URL prefix, so edits/deletes don't silently leak
  quota on the 1GB free-tier budget.
- **New `/admin/storage` page**: live usage vs. the 1GB budget (progress bar, amber/red at
  70%/90%), plus a per-file breakdown (label, owning song/voice part, size) — added to the admin
  nav alongside Members. Not in the original issue scope; added after the app owner asked for
  quota visibility once #36 was underway.
- `next.config.ts`: added a `media-src` CSP directive for the Supabase Storage domain (uploaded
  audio would otherwise be silently blocked by `default-src 'self'`), and raised
  `experimental.serverActions.bodySizeLimit` from Next's 1MB default to `22mb` — required for
  the 20MB upload cap plus multipart overhead; caught while reading this Next.js version's own
  docs under `node_modules/next/dist/docs/` per `AGENTS.md`, not something the original issue
  scoping had flagged.

### Verified

- End-to-end in a real browser against the live Supabase project (temporary throwaway test
  admin account and test song, both cleaned up afterward — not the production admin or real
  song data): upload → playback (no CSP violation) → remove → Storage object actually deleted,
  confirmed via `/admin/storage` showing 0 files. Exercised through both `AddAudioForm` and
  `SongEditor`'s upload path.

## [0.16.0] - 2026-07-19

### Changed

- **Restored a manual invite-link fallback** (closes #35): `inviteMember` now uses
  `auth.admin.generateLink({type: "invite"})` instead of `auth.admin.inviteUserByEmail` —
  `generateLink` only creates the Supabase user and returns a token, it never attempts to send
  email itself, so inviting a new member no longer depends on Supabase's SMTP/domain setup at
  all. The admin UI shows the resulting link on-screen for manual sharing. Reverted from
  v0.15.0's SMTP-routed approach once issue #34 (Resend domain verification) turned out to need
  a hosting purchase the app owner is deferring — restores the "never strand an admin without a
  way to reach the invitee" property from the original pre-v0.15.0 design.
- The link is built from the response's `hashed_token` field
  (`/auth/confirm?token_hash=...&type=invite&next=/accept-invite`), not `action_link`, which
  points at Supabase's own hosted redirect — a different, hash-fragment session style than our
  `/auth/confirm` route expects (see SKILL.md's gotchas).
- **Password-reset email delivery is unchanged** and still fully blocked pending #34 — see
  SKILL.md for why the same fix isn't a trivial copy-paste there (timing-safety trade-off).

## [0.15.1] - 2026-07-19

### Fixed

- **Documented a real link-format gotcha found while verifying the v0.15.0 migration**:
  `auth.admin.generateLink()`'s `action_link` uses Supabase's hosted `/auth/v1/verify` redirect
  (hash-fragment session style), not the `token_hash` query-param style
  `src/app/auth/confirm/route.ts` expects — clicking it directly lands on `/login` with no
  session. The correct link is built from the same response's `hashed_token` field instead. See
  SKILL.md's "Gotchas hit while setting this up." Docs-only; no app code changed (the admin
  account backfill from v0.15.0 already confirmed working end-to-end with the corrected link
  format).

## [0.15.0] - 2026-07-19

### Changed

- **Migrated auth from NextAuth Credentials to Supabase Auth** (closes #10) — the remaining
  half of the original Supabase migration, deferred since v0.8.0. Supabase Auth now owns
  identity, password hashing, and sessions entirely; `public.User` (Prisma) becomes a profile
  table (`role`, `status`, `name`) keyed by a new `authUserId` column, with `Song.createdById`/
  `Trip.createdById` FKs untouched. Role lives in the Supabase JWT's `app_metadata` so
  `src/proxy.ts` can gate `/admin` by reading claims locally (`getClaims()`) with zero Prisma
  calls in the proxy.
- **Retired the custom `Invite`/`PasswordResetToken` tables** in favor of Supabase Auth's own
  `inviteUserByEmail`/`resetPasswordForEmail`/`generateLink`, per the app owner's choice to
  route invite/reset email through Supabase's dashboard-configured SMTP (pointed at Resend)
  rather than keep calling Resend directly from our code for these two flows. `src/lib/email.ts`
  keeps its generic Resend client/HTML helpers for any future non-auth transactional email (see
  issue #11); the two auth-specific senders are gone.
- **`mustChangePassword`/forced `/change-password` retired.** Supabase's invite/recovery flows
  always require setting a real password via a real one-time emailed link before any session
  exists, so there's no more "seeded with a known default password" state to force a redirect
  for. Optional in-session password change lives on `/profile` now.
- **New `/auth/confirm` route** exchanges Supabase's emailed invite/recovery links server-side
  (`token_hash`/`type` based, not the older client-URL auto-detected session — corporate email
  scanners can otherwise burn a single-use token before the real user clicks). `/accept-invite`
  and `/reset-password` are now flat routes (no more per-token dynamic segment) since the
  session is already established by the time the browser lands there.
- **Existing production accounts migrated**: the admin account and two real chorister accounts
  (one active, one with a stale never-completed invite) were backfilled into Supabase Auth via
  a one-off script (not committed — see `authUserId` now set on their `User` rows) and each
  given a working password-reset link to re-set their credentials, since the old bcrypt hashes
  couldn't carry over.

### Known gaps (tracked, not silently deferred)

- **Real invite/reset email delivery isn't live yet.** It needs, in order: issue #34 (Resend
  domain verification), Supabase dashboard SMTP pointed at Resend, and the dashboard's redirect
  URL allow-list configured for the production domain (confirmed missing — a test link
  defaulted to `localhost` because Supabase silently ignores `redirectTo` values not on that
  list). Until all three are done, inviting a new member has no working delivery path — the
  on-screen fallback link that used to cover this was intentionally dropped when the app owner
  chose to route through Supabase's SMTP instead of Resend directly.

## [0.14.0] - 2026-07-19

### Added

- **Real invite/password-reset email delivery via Resend** (closes #9). New
  `src/lib/email.ts` sends both emails directly (not via Supabase Auth's SMTP hook, since the
  Supabase Auth migration in #10 hasn't landed yet); requires `RESEND_API_KEY` (see
  `.env.example`). Without a key configured, both flows fall back to returning the link
  on-screen exactly as before, so a fresh clone with no Resend account still works — the UI now
  distinguishes "Invite email sent." / a generic reset confirmation from an amber "Email not
  sent" fallback box, instead of always showing the dev-only link.
- `requestPasswordReset` fires its send via Next.js's `after()` without awaiting it, so Resend's
  network latency can't reopen the account-enumeration timing side-channel that
  `timingSafetyDelay()` guards against (#18) — the invalid-account branch has no equivalent
  delay to match an awaited send. `inviteMember` has no such constraint (admin-initiated, no
  secret to protect via timing) and awaits its send normally for accurate on-screen feedback.

## [0.13.4] - 2026-07-19

### Changed

- **Updated umoja.pdf and extras/design_process.pdf to cover v0.13.0–v0.13.3** (closes
  #33): umoja.pdf gains the Media/Lyrics page split, composer/lyricist credits, the
  paste-and-parse Replace Lyrics flow with tag carry-forward, the updated route map,
  and documents the SATB (Media page) vs. ALL (Lyrics page) label decisions as
  intentional. design_process.pdf, previously still scoped to only the v0.1.0 POC, was
  rewritten to cover the full v0.1.0 → v0.13.3 delivered history with a recomputed
  man-hour/cost model.
- **Untracked `extras/generate_design_pdf.py`**, the one exception to `extras/` being
  gitignored — now treated like `extras/generate_security_pdf.py`, a local authoring
  tool rather than part of the public repo. Fixed the stale "Current version: 0.8.1"
  line in SKILL.md while updating its data-handling rules to match.
- Docs-only change, no app code touched.

## [0.13.3] - 2026-07-19

### Changed

- **Media page now hides voice groups with no media** (closes #32), instead of showing
  all five (Soprano/Alto/Tenor/Bass/SATB) with a "No media yet." placeholder for
  admins. Only groups that actually have media render; a single "No media added yet."
  message shows if the song has none at all.

## [0.13.2] - 2026-07-19

### Changed

- **Replaced the Media page's "TUTTI (FULL CHOIR)" group label with "SATB"** (closes
  #31), for consistency with the ALL/SATB terminology used elsewhere. Fixed in
  `SONG_PART_LABEL_TEXT.All` (`src/lib/constants.ts`, read live — no data migration
  needed for existing songs) and the matching hardcoded string in `prisma/seed.ts`.

## [0.13.1] - 2026-07-19

### Fixed

- **`/songs/[id]/media` 404ing in production** (closes #30): `.vercelignore`'s
  unanchored `Media/` pattern (meant only for the top-level `Media/` real-data
  directory) also matched the new `src/app/songs/[id]/media/` route folder, so Vercel
  silently dropped that route from every deploy. Anchored both `.vercelignore` entries
  to the repo root (`/Media/`, `/extras/`).

### Changed

- **Reverted the lyrics voice-filter's unfiltered-state label from "SATB" back to
  "ALL"** (closes #30), per the app owner's call after seeing "SATB" live — supersedes
  v0.13.0's rename. Applied via a new `VOICE_TAG_LABEL` display map everywhere a voice
  tag is shown to a user (filter label, per-section pills, the admin editor's
  checkboxes, the Replace Lyrics preview); the underlying stored tag values are
  unchanged.

## [0.13.0] - 2026-07-19

### Added

- **Composer/lyricist credit fields on `Song`** (`composer`, `lyricist`, both nullable —
  additive migration, no data loss). Shown as a "Words: ... Music: ..." subtitle on
  `/songs` cards and the song detail/media/lyrics pages when present; editable on the
  new-song form and the admin song editor.
- **`/songs/[id]/media`** — a dedicated Media page (renamed from "Audio"), showing every
  recording grouped by voice part (Soprano/Alto/Tenor/Bass/full-choir), each with an
  admin-only Remove button, plus an "Add Audio" form (URL, Label, and Voice all
  required) that appends directly to the right voice group without re-submitting the
  whole song.
- **`/songs/[id]/lyrics`** — lyrics moved off the song detail page onto their own page,
  with a breadcrumb and an admin-only Edit button. The unfiltered/default voice-filter
  state is now labeled **SATB** (previously "Full lyrics"), with S/A/T/B as the
  clickable filter tabs.
- **`/songs/[id]/lyrics/edit`** (admin-only) — a "Replace lyrics" page: paste raw lyrics
  (Upload tab present as a disabled placeholder for a future file-import feature),
  Preview to see parsed segments before committing, then Save (first time) or Replace
  Lyrics (destructive-styled, confirms before overwriting) — or Cancel.
- **Lyrics paste-parser** (`src/lib/lyrics-parser.ts`): blank-line-separated segments,
  first line of each segment is its label (e.g. "Verse 1"), and a `[S]`/`[A]`/`[T]`/
  `[B]`/`[ALL]` tag on a line carries forward across subsequent segments until a new tag
  appears — matches today's one-voice-tag-per-section data model, no schema change
  needed for per-line tags.
- **`Breadcrumb` component**, used across the song detail/media/lyrics/lyrics-edit pages.
- Song detail page (`/songs/[id]`) now shows Media and Lyrics as two clickable summary
  cards linking to their own pages, instead of rendering everything inline.

Closes #29.

## [0.12.1] - 2026-07-19

### Changed

- **Rewrote `umoja.pdf`** from the original pre-build design plan into an as-built
  reference (closes #28): current Prisma schema (`Song` -> `SongSection` ->
  `SongMedia`), actual auth stack (NextAuth Credentials, Supabase Auth migration still
  pending), actual route map (no `/admin` dashboard; inline per-section Edit buttons;
  Members nav tab), corrected tech stack (Resend/shadcn not yet in use), live hosting
  status, and a delivered-scope-vs-remaining-work section citing the real tracked
  issues (#9, #10, #11, #17, #18, #20).

## [0.12.0] - 2026-07-19

### Changed

- **Removed the generic "Admin" nav tab and its landing dashboard** (closes #27). Admin
  editing is now surfaced inline, per section, instead of through a separate admin area:
  - `/songs/[id]` gained admin-only Edit + Delete buttons (Edit opens the existing
    `/admin/songs/[id]/edit` form). The now-redundant `/admin/songs` list and
    `/admin/songs/[id]` overview pages were removed — `/songs` + `/songs/[id]` are the
    single browsing surface for everyone, admin or not.
  - `/links` and `/logistics` gained an admin-only "Edit" button linking to their
    existing `/admin/links` / `/admin/logistics` CRUD pages (unchanged).
- Nav gains a **"Members" tab**, visible only to admins, linking to `/admin/members` —
  previously only reachable via the now-removed Admin dashboard.

### Added

- **Real member deletion** (`deleteMember`), not just deactivate. Guarded the same way
  as role/status changes (can't delete yourself, can't remove the last active admin);
  returns a friendly error instead of a hard failure if the member has songs, trips, or
  invites tied to their account (a foreign-key constraint), suggesting deactivation
  instead.

## [0.11.0] - 2026-07-19

### Changed

- **Simplified the public Songs page** (`/songs`, closes #26): dropped the voice-part
  filter pill row (All/Soprano/Alto/Tenor/Bass/Tutti) — it's now a plain grid of song
  title cards, matching a reference screenshot's cleaner list layout.

### Added

- **Admin-only "Add Song" button** on `/songs`, visible only when the logged-in user's
  role is admin; hidden entirely for choristers.

- **Admin song overview page** (`/admin/songs/[id]`), separate from the edit form (closes
  #25). Shows the title, Edit/Delete buttons, and summary cards for Audio (track count,
  voice-part badges) and Lyrics (segment count, voice-tag badges, a short segment-label
  preview). The admin songs list now links here instead of straight into `/edit`.

### Fixed

- `prisma.config.ts` only loaded `.env` (plain `dotenv/config`), so it kept reading a
  stale connection string while `vercel env pull` had been refreshing `.env.local`
  instead — every `prisma migrate deploy` silently used the wrong credentials. Now
  loads `.env` then `.env.local` (override), matching Next.js's own env precedence.

## [0.9.0] - 2026-07-19

### Changed

- **Restructured "Voice parts" so a labeled section can group multiple media items**
  (audio, video, ...) instead of one flat row per media link (closes #24). `Song` now
  only carries `title` at the top level; `sectionLabel`/`labelDescription` moved down
  onto the new `SongSection` model (part, sectionLabel, labelDescription), which has
  many `SongMedia` children (label, mediaUrl, mediaKind). The old `SongPart` model is
  gone.
- Admin "Edit song" screen: the song-level form is now just a Title field; "Voice
  parts" is a list of sections, each with its own add/remove list of media rows.
- Public song browse page (`/songs`)'s voice-part filter now queries
  `sections.some({ part })` instead of the old `Song.sectionLabel` field.

### Migration

- Data-preserving Postgres migration (`20260719120000_restructure_song_voice_parts`):
  every existing `SongPart` row becomes one `SongSection` (reusing its `part`/label)
  plus one `SongMedia` row underneath, before the old table/columns are dropped. No
  existing recordings were lost; applied directly to production.

## [0.8.1] - 2026-07-18

### Security

- Removed the seeded admin/chorister passwords from the tracked `README.md` — they were
  listed in plaintext in a file that's public on GitHub. `npm run db:seed` already prints
  them to the console at seed time, which is enough for local setup (closes #23).

## [0.8.0] - 2026-07-18

### Added

- **Deployed to Vercel** (`egm2/umoja-voices`, live at https://umoja-voices.vercel.app),
  GitHub-connected so pushes to `main` auto-deploy.
- **Wired up a real Supabase Postgres project** via Vercel's Supabase Marketplace integration
  (`vercel integration add supabase`) rather than hand-typing connection strings — closes the
  database half of #10 for real (v0.7.0 had the code ready but untested against a live
  database). Initial migration applied; seed data confirmed present.
- `.vercelignore`, excluding `.env*` (except `.env.example`) so `vercel deploy`'s direct
  local-directory upload never bundles local secrets into a deployment.
- `src/lib/db-url.ts` (`stripSslMode`) — node-postgres treats a connection string's
  `sslmode=require` as an alias for `verify-full`, silently overriding any explicit `ssl`
  option and rejecting Supabase's pooler certificate chain. Stripping the param lets the
  explicit `ssl: { rejectUnauthorized: false }` in `src/lib/prisma.ts`/`prisma/seed.ts` apply.

### Fixed

- An early deploy briefly served a raw Prisma connection error because a stale local `.env`
  got bundled into the deployment and overrode Vercel's own env vars — root cause of the
  `.vercelignore` addition above.

### Verified

- Full login → session → `mustChangePassword` redirect flow tested against the live
  production URL, not just locally.
- Security headers (CSP, HSTS, X-Frame-Options) confirmed present on the live deployment.

### Known limitations (tracked, not silently deferred)

- Auth remains NextAuth Credentials; migrating to Supabase Auth is the remaining scope of #10.
- See `SKILL.md`'s new Deployment section for the operational gotchas hit getting here
  (private-repo GitHub auto-connect, `vercel integration add` creating a new Supabase project
  rather than connecting an existing one, and more) — worth reading before touching this setup
  again.

## [0.7.0] - 2026-07-18

### Changed

- **Database swapped from local SQLite to Supabase Postgres** (`@prisma/adapter-pg`), closing
  the database half of issue #10. `DATABASE_URL` (pooled, Transaction mode) is used for app
  queries; `DIRECT_URL` (direct connection) for migrations, since PgBouncer's transaction-mode
  pooler doesn't support the DDL patterns `prisma migrate` needs.
- Old SQLite migrations deleted (provider-specific DDL, not valid for Postgres); a fresh
  initial migration will be generated against the live Supabase project.
- Auth stays on NextAuth Credentials for now — that's the other, much larger half of #10
  (every page's session check, invite flow, forgot-password, and how rate limiting/
  `mustChangePassword` hook in), deliberately not bundled into this change.

### Fixed

- Every Prisma-backed page (`/links`, `/logistics`, `/admin`, `/admin/songs`, `/admin/links`,
  `/admin/logistics`, `/admin/members`) is now `export const dynamic = "force-dynamic"`.
  Found while testing this migration: without it, Next.js statically prerenders these pages
  at build time by default (only `/songs` was already forced dynamic, via its `searchParams`
  filter) — which wasn't just a build-time inconvenience once there's no DB reachable at
  build time, but a real correctness bug: it would have served build-time-stale admin-edited
  data to every visitor in production until the next deploy, however recently an admin
  changed something.
- `package.json`: added `postinstall: "prisma generate"` (needed now that Vercel will run
  the install/build) and an `engines.node` constraint.

### Known limitations (tracked, not silently deferred)

- Not yet run against a live Supabase project from this environment — no Supabase
  credentials are available here. `npx prisma migrate dev --name init` and `npm run db:seed`
  need to be run once `DATABASE_URL`/`DIRECT_URL` point at a real project.
- Auth remains NextAuth Credentials; migrating to Supabase Auth is the remaining scope of #10.

## [0.6.0] - 2026-07-18

### Added

- Rate limiting on invite creation (`inviteMember`, `src/lib/actions/member-actions.ts`):
  20 invites/hour per admin, 40/hour per IP — looser than the public-facing login/forgot-password
  limits since this is an authenticated, lower-risk action, but no longer unbounded

### Verified

- Reproduced through a full browser flow: 20 consecutive invite submissions each created a
  real user and showed the dev-only invite-link stand-in; the 21st was rejected with a
  distinct "Too many invites sent recently" message and created nothing

### Known limitations (tracked, not silently deferred)

- The rate limiter is in-memory across all three protected entry points (login,
  forgot-password, invite creation) — correct for today's single process, but needs a
  distributed store (e.g. Upstash Redis) before multi-instance/serverless deployment (#20,
  narrowed now that invite creation itself is covered)

## [0.5.0] - 2026-07-18

### Added

- `src/lib/rate-limit.ts` — in-memory fixed-window rate limiting, wired into login
  (`src/lib/auth.ts`: 5 attempts/15min per email+IP, 30/15min per IP) and forgot-password
  (`src/lib/actions/auth-actions.ts`: 3 requests/hour per email+IP, 10/hour per IP). Closes the
  login/forgot-password portion of the v0.4.0 security audit's tracked rate-limiting gap
  (closes #16)
- The login page now distinguishes a rate-limit message from the generic "incorrect
  email or password" (NextAuth's `CredentialsSignin` code stays generic; anything else is a
  message the app threw itself and is safe to show verbatim)

### Verified

- Reproduced concretely with curl: 5 wrong-password attempts do real bcrypt work and fail
  normally; the 6th onward is rejected instantly with the rate-limit message, and the
  *correct* password is rejected too once limited — not just wrong ones
- Reproduced through a full browser flow: 3 forgot-password submissions for a real account
  show the dev-only reset-link stand-in; the 4th shows nothing, indistinguishable from a
  nonexistent account (preserves the no-enumeration property from v0.4.0)
- An unrelated account's login is unaffected, confirming the limiter is scoped per
  email+IP, not global

### Known limitations (tracked, not silently deferred)

- Invite creation isn't rate-limited yet (admin-only, lower risk); the limiter is in-memory,
  correct for today's single process but needs a distributed store (e.g. Upstash Redis)
  before multi-instance/serverless deployment (#20)

## [0.4.0] - 2026-07-18

### Security

Full manual security audit performed and documented privately (`extras/security.pdf`,
generated by the now-tracked `extras/generate_security_pdf.py`), mirroring the Career
Transition project's audit approach. Findings verified concretely (real login/session
flows, a forged cross-origin Server Action request, a production-build header check) rather
than assumed. Fixed in this pass (closes #19):

### Added

- `src/lib/validation.ts` (`clip`/`oneOf`/`subsetOf`) — server-side enum validation and
  input length caps applied across every Server Action, since SQLite has no native enum to
  enforce these at the database layer
- Admin self-lockout and last-active-admin protection in `updateMemberRole`/`setMemberStatus`
- HTTP security headers and a scoped CSP in `next.config.ts` (X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy; CSP `frame-src` allow-listing
  only the embed providers `MediaEmbed.tsx` supports)
- `NEXTAUTH_SECRET` startup enforcement in `src/lib/auth.ts`

### Changed

- `resetPassword` and `acceptInvite` now enforce the same 8-character password minimum
  server-side as `updateProfile`/`setRequiredNewPassword` already did
- `requestPasswordReset` adds a fixed delay on the non-existent-account branch to narrow an
  account-enumeration timing side-channel
- `member-actions.ts`'s guard functions now return `{ error }` instead of throwing;
  `MemberRow.tsx` displays the message and no longer shows a rejected role change as if it
  had silently succeeded (the `<select>` is now a controlled component)

### Known limitations (tracked, not silently deferred)

- No rate limiting on login, forgot-password, or invite creation — needs a real distributed
  backing store (#16)
- CSP allows `'unsafe-inline'` for script-src/style-src, required by Next.js App Router's
  inline hydration scripts; a nonce-based CSP is the correct long-term fix (#17)
- The timing-safety delay is a fixed constant, not adaptive to real production DB latency (#18)

## [0.3.0] - 2026-07-18

### Changed

- Applied a branded visual theme across the app, replacing the default slate/indigo Tailwind
  palette: dark navbar (`bg-ink`) with a pill-style active nav link and brand mark, warm cream
  page background, white cards with a gold left-accent border for songs/admin lists, black
  pill-shaped primary buttons. The app commits to this single look rather than switching with
  the OS light/dark preference (closes #15)

## [0.2.0] - 2026-07-18

### Added

- `users.mustChangePassword`, set `true` for any account created with a known/default
  password (the seeded admin and Demo Chorister accounts). Enforced in `src/proxy.ts`: every
  protected route redirects to the new `/change-password` page until the flag is cleared, so a
  default password can never remain valid indefinitely (closes #14)
- `setRequiredNewPassword` Server Action (`src/lib/actions/profile-actions.ts`) backs
  `/change-password`; `resetPassword` and `acceptInvite` both clear the flag defensively when a
  user sets their own password through those flows too

## [0.1.1] - 2026-07-18

### Fixed

- Seeded admin account used the wrong email (`gitonga@earthranger.com`); corrected to the
  account owner's actual email, `gitonga@gmail.com`, in `prisma/seed.ts` and `README.md`
  (closes #13)

## [0.1.0] - 2026-07-18

### Added

- Initial POC: Next.js 16 (App Router, TypeScript, Tailwind) + Prisma 7 against local SQLite
  + NextAuth v4 credentials auth, as the initial working slice of the design plan in `umoja.pdf`.
- Auth: login, admin-invite flow (accept-invite by token), self-service forgot/reset password —
  Server Actions with expiring, single-use tokens (closes #1)
- Song library: admin CRUD for songs with S/A/T/B/All voice parts, pasted-link media detection
  (YouTube/Google Drive/SoundCloud/direct audio-video file, with a `direct_url` fallback for
  anything else), inline embedded players, and a song-level section label (S/A/T/B/SATB —
  Compulsory) with a required free-text description (closes #2)
- Structured lyrics: ordered, labeled sections (verse/chorus/bridge/intro/outro/vamp/custom),
  each tagged with which voice(s) sing it; a click-to-filter view lets a chorister see just
  their part's lyrics plus full-choir (SATB) sections (closes #3)
- External links page, admin-managed, grouped by category (closes #4)
- Logistics page: current trip's key dates/deadlines, itinerary, and practice schedule,
  admin-editable and chorister read-only (closes #5)
- Admin member management: list, invite (name/email/role), role toggle, activate/deactivate
  (closes #6)
- App footer displays the running version, read from `VERSION` (closes #7)
- Repository/tracking protocol: `SKILL.md` adapted from the Career Transition project
  (SemVer + `VERSION` + `CHANGELOG.md`, tag/release workflow, security-first control table,
  `Media/` and `extras/` data-handling rules), `extras/log_effort.py` +
  `extras/effort.xlsx` effort tracking (closes #8)
- Seed script (`prisma/seed.ts`) with one admin account and one fictitious "Demo Chorister"
  account, a placeholder demo song, and the confirmed Portugal & Germany Tour 2026 trip
  (dates only — no real member data)

### Known limitations (tracked, not silently deferred)

- No transactional email provider yet — invite and password-reset links are shown directly to
  the admin/user instead of emailed (#9)
- Runs on local SQLite + NextAuth Credentials rather than the design's target Supabase
  Postgres + Supabase Auth (#10)
- No calendar (ICS) feed yet for practice sessions/itinerary (#11)
- No security audit yet — deliberately deferred until the POC is validated (#12)
