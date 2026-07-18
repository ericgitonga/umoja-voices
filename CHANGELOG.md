# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org) (pre-1.0, see `SKILL.md`).

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
