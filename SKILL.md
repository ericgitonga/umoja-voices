# SKILL: Umoja Voices — Choir Management App

Umoja Voices is a choir management web app: a song library with per-voice-part media and
structured, voice-tagged lyrics; admin/chorister accounts with an invite-only signup flow;
a travel logistics section for performance trips; and a public-facing external links page.
Full requirements and rationale live in `umoja.pdf` (the design plan, reviewed and confirmed
section by section before any code was written).

---

## Versioning

Current version: **0.16.0** (see `VERSION` and `CHANGELOG.md`).

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
| Password hashing (Supabase Auth) | Passwords are never stored or compared by our own code — Supabase Auth owns hashing/verification entirely (see #10) |
| Role-gated routing (`src/proxy.ts`) | `/admin/*` requires `role: "admin"` in the Supabase JWT's `app_metadata`, read via `getClaims()`; unauthenticated requests to any protected route redirect to `/login` |
| Session strategy: Supabase Auth (JWT + refresh cookie) | No server-side session store to leak; `src/lib/supabase/server.ts`/`src/proxy.ts` refresh the session cookie via `@supabase/ssr` |
| Single-use invite/reset links (Supabase Auth) | `auth.admin.inviteUserByEmail`/`resetPasswordForEmail`/`generateLink` generate Supabase's own time-limited, single-use tokens, exchanged server-side via `verifyOtp` in `src/app/auth/confirm/route.ts` |
| No account-existence leakage | `requestPasswordReset` returns the same response whether or not the email matches an account |
| `direct_url` fallback, not raw HTML embeds | Unrecognized media links render as a plain outbound `<a>`, never as arbitrary embedded markup |
| Server Actions require `role: "admin"` server-side | Every mutation in `src/lib/actions/*` re-checks the session role itself — the admin-only UI is a convenience, not the enforcement boundary |
| Admin self-lockout / last-admin protection | `updateMemberRole`/`setMemberStatus` refuse to let an admin change their own role/status, and refuse to leave zero active admins |
| Server-side enum validation + input length caps | `src/lib/validation.ts` (`clip`/`oneOf`/`subsetOf`), applied to every enum-like and free-text field a Server Action writes — SQLite has no native enum, so this is the only enforcement |
| Rate limiting on login, forgot-password, and invite creation | `src/lib/rate-limit.ts` — per-IP and per-identifier (email or admin id) fixed windows: 5/15min + 30/15min per IP for login, 3/hr + 10/hr per IP for forgot-password, 20/hr + 40/hr per IP for invites. In-memory, correct for today's single process; a distributed store (Upstash Redis) is needed before multi-instance deployment — tracked, see below |
| HTTP security headers + scoped CSP | `next.config.ts`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and a CSP whose `frame-src` allow-list matches exactly what `src/components/MediaEmbed.tsx` supports |
| Server Action CSRF protection (framework) | Next.js's built-in same-origin check on Server Actions — verified with a forged cross-origin request, not just assumed (see `extras/security.pdf`) |
| Pinned dependencies | `package-lock.json` is committed; dependency bumps are deliberate, not automatic |

A full audit was performed at v0.3.0 (with the rate-limiting gap it found closed at v0.5.0 and
v0.6.0) — see `extras/security.pdf` (gitignored; regenerate with `conda run -n ds python
extras/generate_security_pdf.py`, itself gitignored per the data handling rules below) for the
complete findings, what was fixed, what was reviewed and confirmed safe, and what's still
accepted as a tracked POC-stage trade-off (swapping the in-memory rate limiter for a
distributed store before multi-instance deployment (#20), CSP `'unsafe-inline'` (#17), and the
fixed-delay timing mitigation (#18)).

### POC-specific stand-ins (tracked, to close before production)

- **Database**: closed at v0.8.0 — Supabase Postgres via `@prisma/adapter-pg`, wired up through
  Vercel's official Supabase Marketplace integration (`vercel integration add supabase`),
  which auto-provisions `POSTGRES_PRISMA_URL` (pooled, app queries) and
  `POSTGRES_URL_NON_POOLING` (direct, migrations) correctly for every environment — avoids the
  password-percent-encoding pitfall of hand-typing `DATABASE_URL`/`DIRECT_URL` from Supabase's
  dashboard (both remain supported as fallbacks for projects without the integration). Verified
  live: deployed to Vercel production, migration applied, seed data confirmed present, and a
  full login → `mustChangePassword` redirect flow tested against the real deployed URL. No
  longer a stand-in.
- **Auth provider**: closed at v0.15.0 — Supabase Auth replaces NextAuth Credentials entirely
  (`src/lib/supabase/`, `src/lib/get-session.ts`, `src/proxy.ts`). `public.User` (Prisma) is now
  a profile table (`role`/`status`/`name`) keyed by `authUserId`; the old `Invite`/
  `PasswordResetToken` tables and `mustChangePassword`/forced `/change-password` are retired —
  see `CHANGELOG.md`'s v0.15.0 entry for the full architecture.
- **Invite email delivery**: closed at v0.16.0 with a manual-link fallback, not real delivery.
  `inviteMember` uses `auth.admin.generateLink({type: "invite"})` (closes #35) — this only
  creates the Supabase user and returns a token, it never attempts to send anything itself, so
  it has zero dependency on Supabase's SMTP/domain setup. The admin UI shows the resulting link
  on-screen for the admin to share manually (WhatsApp, etc.). Reverted from v0.15.0's
  `inviteUserByEmail` approach once issue #34 (Resend domain verification) needed a hosting
  purchase the app owner deferred — this restores exactly the "never strand an admin without a
  way to reach the invitee" property the app has had since the original custom-token design.
- **Password-reset email delivery**: still a stand-in. `requestPasswordReset` calls Supabase's
  `resetPasswordForEmail`, which — unlike `generateLink` — only ever attempts to send via
  Supabase's dashboard-configured SMTP, with no fallback link returned. That SMTP isn't pointed
  at Resend yet, and Supabase's redirect allow-list doesn't include the production domain yet
  (confirmed: a generated link silently fell back to `localhost`). Until both are set (and
  issue #34 lands), self-service password reset for anyone but the admin (who can be given a
  link directly via `auth.admin.generateLink({type:"recovery"})`, as done for the v0.15.0
  account migration) has no working delivery path. Applying the same `generateLink` fallback
  fix used for invites is a reasonable follow-up, but reintroduces the account-enumeration
  timing question `after()`'s fire-and-forget was specifically added to avoid (#18) — needs a
  deliberate decision, not a copy-paste of the invite fix.

### When making changes

- Any new Server Action that mutates data must call its own `requireAdmin()` (or equivalent)
  check — never rely solely on the page/route being behind `/admin`.
- Any new "enum-like" field goes in `prisma/schema.prisma` as a commented `String`, with the
  allowed values added to `src/lib/constants.ts` — never a native Prisma `enum`. This predates
  the Postgres migration (SQLite had no enum type) and is kept for consistency now that
  everything is one shape; `src/lib/validation.ts` is the actual enforcement either way.
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
- **`extras/` is fully gitignored** — effort log, cost workings, generated PDFs, and both
  generator scripts (`generate_design_pdf.py`, `generate_security_pdf.py`). It is internal
  business documentation and dev-only authoring tooling, not something that belongs in a
  project's public history. `generate_design_pdf.py` was tracked as a one-off exception
  through v0.13.2 (it contains no real member data or secrets, only illustrative market-rate
  estimates) but was untracked at v0.13.3 for consistency with `generate_security_pdf.py` —
  both scripts are local tools now, regenerate their PDFs locally rather than expecting them
  in a fresh clone.
- **`extras/generate_security_pdf.py`** and its output `extras/security.pdf` stay fully
  gitignored — internal audit findings, not for public view. The audit was performed earlier
  than originally planned (at v0.3.0, not "post-POC") at the project owner's request; the rule
  about what stays private is unchanged by when the audit happens.
- **Never commit `.env`.** It holds the Supabase `DATABASE_URL`/`DIRECT_URL` connection
  strings and `SUPABASE_SECRET_KEY` — real credentials, not sample data.

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
Vercel). Currently:

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Prisma 7 (`@prisma/adapter-pg`) against Supabase Postgres — `DATABASE_URL` is the pooled
  (Transaction mode) connection for app queries, `DIRECT_URL` is the direct connection for
  migrations. Enum-like fields are still plain `String` columns kept in sync with
  `src/lib/constants.ts` (see `prisma/schema.prisma`'s header), not native Postgres enums —
  `src/lib/validation.ts` is the real enforcement
- Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) for identity, password, and
  sessions — closed at v0.15.0 (#10)
- `src/proxy.ts` (Next.js 16's renamed `middleware` convention) for role-gated routing
- Every Prisma-backed page is `export const dynamic = "force-dynamic"` — these show
  live, admin-editable data, so none of it may be statically cached at build time

---

## Deployment

Live at **https://umoja-voices.vercel.app**. Vercel project `egm2/umoja-voices`, GitHub-connected
(pushes to `main` auto-deploy). Database: Supabase Postgres, connected via Vercel's Supabase
Marketplace integration (`vercel integration add supabase`) rather than by hand-typing
connection strings — see the "Database" stand-in note above for why.

### Gotchas hit while setting this up (don't re-debug these)

- **`supabase.auth.admin.generateLink()`'s `action_link` uses Supabase's own hosted
  `/auth/v1/verify` redirect, which is a different (hash-fragment session) style than the
  `token_hash` query-param style `src/app/auth/confirm/route.ts` expects** — clicking
  `action_link` directly just bounces to `redirect_to` with nothing our route can consume,
  landing on `/login` with no session. Build the link yourself instead, using the
  `hashed_token` field from the same response (`data.properties.hashed_token`):
  `${appBaseUrl()}/auth/confirm?token_hash=${hashed_token}&type=recovery&next=/reset-password`.
  This is what Supabase's own dashboard email templates do under the hood
  (`{{ .TokenHash }}`) — `generateLink`'s convenience `action_link` just doesn't follow the
  same pattern.
- **Supabase silently ignores a `redirectTo`/`options.redirectTo` value that isn't on the
  dashboard's redirect URL allow-list** — it falls back to the project's configured Site URL
  instead (still `http://localhost:3000` here as of v0.15.0, a pending manual step) rather than
  erroring, so a wrong-looking redirect can look like a code bug when it's actually a dashboard
  config gap.
- **`vercel deploy` uploads the local directory directly, not from git.** A stray local `.env`
  got bundled into an early deploy and silently overrode Vercel's own env vars. `.vercelignore`
  now excludes `.env*` (except `.env.example`) — keep it that way; only Vercel's Environment
  Variables should ever apply to a deployed environment.
- **Vercel's GitHub auto-connect (`vercel link` / `vercel git connect`) fails silently on
  private repos** without the Vercel GitHub App explicitly authorized for that repo. Making the
  repo public was what fixed it here; for a private repo, connect via the dashboard
  (Settings → Git) instead, which prompts the GitHub App install/authorization flow.
  Deploying isn't blocked either way — `vercel deploy` works from the CLI regardless of git
  connection status, just without auto-deploy-on-push.
- **`vercel integration add supabase` provisions a brand-new Supabase project** — it does not
  connect an existing one you created directly on supabase.com. If you already have a Supabase
  project you want to keep using, connect it from Supabase's own dashboard (Project Settings →
  Integrations → Vercel) instead of running the Vercel-side install.
- **node-postgres treats `sslmode=require` in a connection string as an alias for
  `verify-full`** (strict CA-chain verification), which silently overrides any explicit `ssl`
  option passed to `pg.Pool`/`PrismaPg` — Supabase's pooler certificate chain then gets
  rejected ("self-signed certificate in certificate chain") regardless of what's configured in
  code. `src/lib/db-url.ts`'s `stripSslMode()` removes the param so the explicit
  `ssl: { rejectUnauthorized: false }` in `src/lib/prisma.ts`/`prisma/seed.ts` actually applies.
  `prisma migrate` itself isn't affected — it uses Prisma's own TLS stack, not `pg`.
- **A local sandbox may redact detected secrets in file contents it observes** (not just tool
  output) — a `vercel env pull` result read back through certain tool calls came back as
  literal `"[SENSITIVE]"` placeholders. Run credential-handling commands (`vercel env pull`,
  `prisma migrate dev` against production) directly, not through anything that echoes file
  contents back for inspection, and never try to "work around" the redaction — treat it as a
  hard boundary, not a bug to route past.

---

## Quality checklist before delivering

### Security checks (run first)
- [ ] `Media/` does not appear in `git status`, `git add`, or `git commit` output
- [ ] `.env` is not tracked (`git ls-files .env` returns nothing)
- [ ] `extras/generate_security_pdf.py` is not tracked (`git ls-files extras/generate_security_pdf.py` returns nothing)
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
prisma/schema.prisma      ← data model (Postgres/Supabase; see file header for the enum note)
prisma/seed.ts            ← demo data: admin + Demo Chorister + one placeholder song/trip
umoja.pdf                 ← the reviewed design plan — authoritative for requirements
extras/effort.xlsx        ← gitignored; hours log, see "Effort tracking" above
extras/design_process.pdf ← gitignored; generated by the (also gitignored) extras/generate_design_pdf.py
Media/                    ← gitignored permanently; real WhatsApp export, never committed
```
