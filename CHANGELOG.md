# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org) (pre-1.0, see `SKILL.md`).

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
