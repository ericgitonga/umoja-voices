# SKILL: Umoja Voices — Choir Management App

Umoja Voices is a choir management web app: a song library with per-voice-part media and
structured, voice-tagged lyrics; admin/chorister accounts with an invite-only signup flow;
a travel logistics section for performance trips; and a public-facing external links page.
Full requirements and rationale live in `umoja.pdf` (the design plan, reviewed and confirmed
section by section before any code was written).

---

## Versioning

Current version: **0.3.0** (see `VERSION` and `CHANGELOG.md`).

This project follows [Semantic Versioning](https://semver.org) (MAJOR.MINOR.PATCH) and is
pre-1.0: the major version stays at `0` throughout initial development. Major only moves to
`1.0.0` when the app is explicitly declared production-ready (real Supabase/Postgres backing,
real email delivery, hosted); after that, MAJOR is reserved for breaking changes to the data
model or auth model.

- **MINOR** — new features, new pages/routes, new schema fields, new user-facing behaviour.
- **PATCH** — bug fixes, docs-only changes, refactors, repository housekeeping.

Before committing any change: bump the version in `VERSION` (and `package.json`'s `version`
field, which must always match), add a dated entry to `CHANGELOG.md` (referencing the GitHub
issue number), and update this line if the version changed.

### Tags and GitHub Releases

Every version bump gets a real, pushed git tag and a published GitHub Release — a
`CHANGELOG.md` entry claiming a version alone is not sufficient. After the version-bump
commit is pushed:

1. Create an annotated tag matching the new version, e.g.:
   `git tag -a v0.2.0 -m "v0.2.0 - <one-line summary> (closes #N)"`
2. Push the tag: `git push origin v0.2.0` (never `git push --tags` — push the one tag just
   created, so an unrelated stray local tag is never published by accident).
3. Publish a GitHub Release for that tag with `gh release create v0.2.0 --repo
   ericgitonga/umoja-voices --title v0.2.0 --notes-file <notes>`, where the notes file
   contains:
   - A `## What's Changed` heading
   - The same `###` subheading (Added/Changed/Fixed/Security/Removed) and bullets used in the
     `CHANGELOG.md` entry for that version, verbatim
   - A trailing `**Full Changelog**: https://github.com/ericgitonga/umoja-voices/compare/vPREVIOUS...vNEW`
     line, using the immediately preceding tag (omit this line only for the very first release)

Do not use `--generate-notes` — it produces GitHub's PR-derived notes, which do not match this
project's `CHANGELOG.md` wording or level of detail. The release body must be built from the
`CHANGELOG.md` entry, not generated separately from it, so the two never drift apart.

If several commits land before a release is cut, only tag and release once, at the final
version for that batch of work — do not create a tag/release per intermediate commit.

### GitHub Issues

Every non-trivial unit of work gets a GitHub issue opened first (`gh issue create --repo
ericgitonga/umoja-voices`), closed via `closes #N` in the commit or PR that finishes it. This
applies to POC scope items as much as later feature work — the issue tracker is the backlog,
not an afterthought bolted on once something ships.

### Displaying the version in the app

The running app's footer (`src/components/Footer.tsx`) reads `VERSION` at request time and
shows it on every page (`Umoja Voices · vX.Y.Z`). If `VERSION` and `package.json`'s `version`
ever drift, the footer is right and `package.json` is wrong — fix `package.json` to match.

---

## Security First

All components — the app, the auth layer, and the database — are built with security as a
primary requirement, not an afterthought.

### Current controls (POC)

| Control | What it does |
|---|---|
| Password hashing (bcryptjs, 12 rounds) | Passwords are never stored or compared in plaintext |
| Role-gated routing (`src/proxy.ts`) | `/admin/*` requires `role: "admin"` in the session JWT; unauthenticated requests to any protected route redirect to `/login` |
| Session strategy: signed JWT (NextAuth) | No server-side session store to leak; the JWT is signed with `NEXTAUTH_SECRET`, which the app refuses to start meaningfully without |
| Expiring, single-use invite/reset tokens | `Invite.token` and `PasswordResetToken.token` are random (`crypto.randomBytes(24)`), time-limited, and marked used/accepted so a link can't be replayed |
| Forced password change on default-password accounts | `users.mustChangePassword` (set `true` on any account created with a known/default password, e.g. `prisma/seed.ts`) is enforced in `src/proxy.ts` — every route redirects to `/change-password` until it's cleared, so a default password can never remain valid indefinitely |
| No account-existence leakage | `requestPasswordReset` returns the same response whether or not the email matches an account |
| `direct_url` fallback, not raw HTML embeds | Unrecognized media links render as a plain outbound `<a>`, never as arbitrary embedded markup |
| Server Actions require `role: "admin"` server-side | Every mutation in `src/lib/actions/*` re-checks the session role itself — the admin-only UI is a convenience, not the enforcement boundary |
| Pinned dependencies | `package-lock.json` is committed; dependency bumps are deliberate, not automatic |

### POC-specific stand-ins (tracked, to close before production)

- **Auth provider**: NextAuth Credentials + local SQLite, not Supabase Auth — because this
  dev environment has no Docker/Postgres and standing up a hosted Supabase project needs the
  project owner's account. The design plan (`umoja.pdf`) still specifies Supabase Auth/Postgres
  for production; swapping in is a `datasource.provider` + auth-provider change, not a schema
  rewrite (see the "no native enum" note in `prisma/schema.prisma`).
- **Invite / password-reset emails**: no transactional email provider (Resend) is wired up yet.
  `inviteMember` and `requestPasswordReset` return the link directly to the admin/user instead
  of emailing it — clearly labelled as a dev-only stand-in in both the UI and the code comments.
  Wiring up Resend is tracked as a follow-up issue, not silently deferred.

### When making changes

- Any new Server Action that mutates data must call its own `requireAdmin()` (or equivalent)
  check — never rely solely on the page/route being behind `/admin`.
- Any new "enum-like" field goes in `prisma/schema.prisma` as a commented `String`, with the
  allowed values added to `src/lib/constants.ts` — never a native Prisma `enum` (SQLite has no
  enum type; keeping the same shape now avoids a migration rewrite when the datasource changes).
- Any new pasted-link media type must be handled in `detectMediaKind()` and `MediaEmbed.tsx`
  with a graceful fallback to `direct_url` if detection fails — never throw or silently drop
  the part.

---

## Data handling rules

- **Never commit `Media/`.** It holds the real WhatsApp export (member names, phone numbers,
  private conversations) used only to inform design decisions. `Media/` is gitignored
  permanently — nothing in it is ever added, and nothing from it is ever quoted verbatim into
  a tracked file, a commit message, an issue, a git tag, or a GitHub Release.
- **Never name a real choir member anywhere tracked or gitignored** — not in `CHANGELOG.md`,
  a commit message, a git tag, a GitHub Release, `extras/generate_design_pdf.py`,
  `extras/design_process.pdf`, or any other file. Describe a motivating example generically
  (e.g. "a member missed the RSVP deadline") instead of naming anyone.
- **The one exception is the app owner, Eric Gitonga**, who is also the seeded admin account
  — safe to name anywhere, same as `gitonga@gmail.com` appears throughout the Career
  Transition project's own `SKILL.md`. **The second exception is "Demo Chorister"**
  (`demo.chorister@example.com`, seeded in `prisma/seed.ts`) — a fictitious account created
  specifically to demo the chorister view, safe to name anywhere, playing the same role Alex
  Mercer plays in the Career Transition project. Use it rather than inventing a new placeholder
  or reaching for a real member's name.
- **`extras/` is gitignored** (effort log, cost workings, generated PDFs) — it is internal
  business documentation, not something that belongs in a project's public history. The one
  exception is `extras/generate_design_pdf.py`, which is tracked because it contains no real
  member data, no secrets, and no real financial figures beyond illustrative market-rate
  estimates — only the script is public; its output `extras/design_process.pdf` still lives in
  the gitignored `extras/` directory as a generated artefact.
- **`extras/generate_security_pdf.py`** (once written, post-POC) and its output
  `extras/security.pdf` stay fully gitignored — internal audit findings, not for public view.
- **Never commit `prisma/dev.db`.** It's the local POC datastore; it will contain seeded
  password hashes and, once real use starts, real member data. Regenerate it locally with
  `npx prisma migrate dev` + `npm run db:seed`.

---

## Effort tracking

Every session of work on this project gets logged to `extras/effort.xlsx` (sheet `time_log`),
via `extras/log_effort.py` — mirroring the Career Transition project's `log_time_spent.py`
exactly, so hours across both projects are recorded the same way and comparable when pricing
similar engagements. One row per day worked; the date is always the EAT (UTC+3,
Africa/Nairobi, no DST) calendar date.

```
# Log today (EAT) directly:
python extras/log_effort.py 2.5 "v0.1.0 -- repo/tracking setup, POC scaffold"

# Log a specific past date:
python extras/log_effort.py 1 "design plan review" --date 2026-07-17

# Update today's row instead of adding a new one:
python extras/log_effort.py 0.5 "follow-up fix" --amend
```

Run it with the `ds` conda environment (`conda run -n ds python extras/log_effort.py ...`),
which has `openpyxl` installed — do not `pip install` into the system/base interpreter.

Log a session's hours whenever asked to, or proactively at the end of a substantial piece of
work — do not wait to be reminded twice in the same session.

---

## Tech stack

See `umoja.pdf` Section 8 for the full production-target rationale (Next.js + Supabase +
Vercel). The POC currently runs on:

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Prisma 7 (`@prisma/adapter-better-sqlite3`) against a local SQLite file — see the
  "no native enum" comment at the top of `prisma/schema.prisma` for why enum-like fields are
  plain `String` columns, kept in sync with `src/lib/constants.ts`
- NextAuth v4 (Credentials provider, JWT sessions) as a stand-in for Supabase Auth
- `src/proxy.ts` (Next.js 16's renamed `middleware` convention) for role-gated routing

---

## Quality checklist before delivering

### Security checks (run first)
- [ ] `Media/` does not appear in `git status`, `git add`, or `git commit` output
- [ ] `prisma/dev.db` is not tracked (`git ls-files prisma/dev.db` returns nothing)
- [ ] `extras/generate_security_pdf.py` (once it exists) is not tracked
- [ ] No real choir member's name or phone number is in any committed file or git log entry
- [ ] Every new Server Action that mutates data checks `role === "admin"` itself where required
- [ ] If any new dependency was added, `package-lock.json` was committed alongside it

### Content / functional checks
- [ ] `npx tsc --noEmit` and `npm run build` both succeed
- [ ] `VERSION` and `package.json`'s `version` match
- [ ] `CHANGELOG.md` has a dated entry referencing the relevant issue number(s)
- [ ] The footer shows the current version on a real page load
- [ ] New enum-like values are added to `src/lib/constants.ts`, not hardcoded inline
- [ ] A tag and GitHub Release were cut for the new version (not skipped "for a small change")

---

## Files to keep

```
prisma/schema.prisma      ← data model (see file header for the SQLite/enum note)
prisma/seed.ts            ← demo data: admin + Demo Chorister + one placeholder song/trip
umoja.pdf                 ← the reviewed design plan — authoritative for requirements
extras/effort.xlsx        ← gitignored; hours log, see "Effort tracking" above
extras/design_process.pdf ← gitignored; generated by the tracked extras/generate_design_pdf.py
Media/                    ← gitignored permanently; real WhatsApp export, never committed
```
