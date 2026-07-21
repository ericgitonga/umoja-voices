# SKILL: Umoja Voices — Choir Management App

Umoja Voices is a choir management web app: a song library with per-voice-part media and
structured, voice-tagged lyrics; admin/chorister accounts with an invite-only signup flow;
a travel logistics section for performance trips; and a public-facing external links page.
Full requirements, as-built reference, design rationale, and cost record live in
`extras/umoja_technical_document.pdf` (source: `extras/umoja_technical_document.md`, converted
via the `topdf` skill) — a single living document, updated after each issue tackled. It replaces
what were previously two separate files (`umoja.pdf`, `extras/design_process.pdf`) as of
v0.17.0.

---

## Versioning

Current version: **0.26.0** (see `VERSION` and `CHANGELOG.md`).

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

### Branch-per-issue workflow (as of 2026-07-21, after #44/#52 landed)

Work no longer lands by pushing straight to `main`. For each issue:

1. Branch off `main`: `git checkout -b <short-description>` (e.g. `fix/song-credits-display`).
2. Do the work, commit(s) as normal (still following the version-bump-before-commit rule below).
3. Push the branch and open a PR (`gh pr create`) with `closes #N` in the body.
4. The `E2E (Preview)` GitHub Actions check (`.github/workflows/e2e.yml`, #44) runs automatically
   against the Preview/Development Supabase project (#52) — never production. Wait for it (and
   the Vercel Preview deployment check) to go green.
5. Only merge to `main` once the E2E check passes. Prefer `gh pr merge --squash` (or whatever
   keeps history clean) over merging a red PR "to fix forward" — a failing gate that gets merged
   anyway defeats the entire point of #44/#52.
6. Delete the branch after merging (`gh pr merge --delete-branch`, or `git branch -d` /
   `git push origin --delete` if closed without merging, e.g. a throwaway verification PR).

This applies to every issue going forward, not just large/risky ones — the whole reason #52 and
#44 exist is so this is now safe and fast to do for anything, not just big changes.

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
| Rate limiting on login, forgot-password, invite creation, and admin reset-link generation | `src/lib/rate-limit.ts` — per-IP and per-identifier (email or admin id) fixed windows: 5/15min + 30/15min per IP for login, 3/hr + 10/hr per IP for forgot-password, 20/hr + 40/hr per IP for invites and for reset-link generation. Backed by a `RateLimitBucket` table in Supabase Postgres (closed #20, v0.19.0) via an atomic `INSERT ... ON CONFLICT` — shared across every serverless instance, not per-process in-memory state |
| HTTP security headers | `next.config.ts`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Nonce-based CSP (closed #17, v0.18.1) | Generated per-request in `src/proxy.ts` (a fresh nonce every request, not a static header — Next's documented pattern), `script-src`/`style-src` restricted to `'nonce-*' 'strict-dynamic'` in production with no `'unsafe-inline'`; `frame-src` allow-list matches exactly what `src/components/MediaEmbed.tsx` supports. Nonces don't cover inline `style="..."` attributes (only `<style>`/`<script>` elements) — any page needing a dynamic inline style reads the nonce via `headers()` and uses a nonced `<style>` tag instead (see `src/app/admin/storage/page.tsx`) |
| Server Action CSRF protection (framework) | Next.js's built-in same-origin check on Server Actions — verified with a forged cross-origin request, not just assumed (see `extras/security.pdf`) |
| Pinned dependencies | `package-lock.json` is committed; dependency bumps are deliberate, not automatic |

A full audit was performed at v0.3.0 (with the rate-limiting gap it found closed at v0.5.0 and
v0.6.0) — see `extras/security.pdf` (gitignored; regenerate with `conda run -n ds python
extras/generate_security_pdf.py`, itself gitignored per the data handling rules below) for the
complete findings, what was fixed, what was reviewed and confirmed safe. All three POC-stage
trade-offs the audit originally flagged are now closed: CSP `'unsafe-inline'` (#17), the
fixed-delay timing mitigation (#18), and the in-memory rate limiter (#20) — see the table above
and v0.18.0/v0.18.1/v0.19.0.

### POC-specific stand-ins (tracked, to close before production)

- **Database**: closed at v0.8.0 — Supabase Postgres via `@prisma/adapter-pg`, wired up through
  Vercel's official Supabase Marketplace integration (`vercel integration add supabase`),
  which auto-provisions `POSTGRES_PRISMA_URL` (pooled, app queries) and
  `POSTGRES_URL_NON_POOLING` (direct, migrations) correctly for every environment — avoids the
  password-percent-encoding pitfall of hand-typing `DATABASE_URL`/`DIRECT_URL` from Supabase's
  dashboard (both remain supported as fallbacks for projects without the integration). Verified
  live: deployed to Vercel production, migration applied, seed data confirmed present, and a
  full login → `mustChangePassword` redirect flow tested against the real deployed URL. No
  longer a stand-in. Environment isolation (Preview/dev vs. Production using separate Supabase
  projects) closed separately at v0.23.0 (#52) — see the Deployment section below.
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
  a commit message, a git tag, a GitHub Release, `extras/umoja_technical_document.md`, or any
  other file. Describe a motivating example generically (e.g. "a member missed the RSVP
  deadline") instead of naming anyone.
- **The one exception is the app owner, Eric Gitonga**, who is also the seeded admin account
  — safe to name anywhere, same as `gitonga@gmail.com` appears throughout the Career
  Transition project's own `SKILL.md`. **The second exception is "Demo Chorister"**
  (`demo.chorister@example.com`, seeded in `prisma/seed.ts`) — a fictitious account created
  specifically to demo the chorister view, safe to name anywhere, playing the same role Alex
  Mercer plays in the Career Transition project. Use it rather than inventing a new placeholder
  or reaching for a real member's name.
- **`extras/` is fully gitignored** — effort log, cost workings, generated PDFs, the markdown
  source, and the security-PDF generator script. It is internal business documentation and
  dev-only authoring tooling, not something that belongs in a project's public history.
  `generate_design_pdf.py` was tracked as a one-off exception through v0.13.2 (it contains no
  real member data or secrets, only illustrative market-rate estimates), untracked at v0.13.3
  for consistency with `generate_security_pdf.py`, then **deleted outright at v0.17.0**: its
  output (`design_process.pdf`) was merged into `extras/umoja_technical_document.md`/`.pdf`
  (see the top of this file), which is maintained directly as markdown and rendered via the
  `topdf` skill instead of a bespoke ReportLab script.
- **`extras/generate_security_pdf.py`** and its output `extras/security.pdf` stay fully
  gitignored — internal audit findings, not for public view. The audit was performed earlier
  than originally planned (at v0.3.0, not "post-POC") at the project owner's request; the rule
  about what stays private is unchanged by when the audit happens.
- **Never commit `.env`.** It holds the Supabase `DATABASE_URL`/`DIRECT_URL` connection
  strings and `SUPABASE_SECRET_KEY` — real credentials, not sample data.

---

## Effort tracking

Every work SESSION on this project gets logged to `extras/effort.xlsx` (sheet `time_log`), via
`extras/log_effort.py`. **As of 2026-07-22, this is one row per session, not per day** — the
sheet has a "Time of Start" column (right after Date) so multiple sessions on the same date get
their own distinct rows instead of being merged. The date is always the EAT (UTC+3,
Africa/Nairobi, no DST) calendar date.

Live tracking (no `--date`) auto-detects whether you're continuing the most recent session or
starting a new one: if the last row is today's date AND `effort.xlsx` was last saved less than 1
hour ago (a proxy for "last activity"), hours/summary are merged into that row; a longer gap
means the prior session ended, so a new row is created with "Time of Start" set to now. No more
manually deciding whether to pass `--amend`.

```
# Start (or continue) tracking today's live session:
python extras/log_effort.py 0 "#65 -- clarify add song page (session started)"
python extras/log_effort.py 1.5 "#65 -- voice-part dropdown fix"

# Force a new session row even though <1h has passed since the last save:
python extras/log_effort.py 0.5 "#66 -- unrelated follow-up" --new

# Backfill a specific past date (never auto-detects by gap — defaults to a new row):
python extras/log_effort.py 1 "design plan review" --date 2026-07-17

# Merge into a specific past date's existing row instead of adding a new one:
python extras/log_effort.py 0.5 "follow-up fix" --date 2026-07-17 --amend
```

Run it with the `ds` conda environment (`conda run -n ds python extras/log_effort.py ...`),
which has `openpyxl` installed — do not `pip install` into the system/base interpreter.

Log a session's hours whenever asked to, or proactively at the end of a substantial piece of
work — do not wait to be reminded twice in the same session. Rows from before 2026-07-22 have a
blank "Time of Start" (day-aggregate rows predating this feature) — leave them as-is.

---

## Tech stack

See `extras/umoja_technical_document.pdf` Section 9 for the full production-target rationale (Next.js + Supabase +
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

## E2E testing (closed #44, v0.24.0)

Golden-path smoke suite in `e2e/` (login/role gating, song library/detail/media), gated in CI
on every PR before it can merge to `main` (`.github/workflows/e2e.yml`). Runs against the
Preview/Development Supabase project from #52 — never production.

**Written in Python (`playwright`), not `@playwright/test`** — deliberate: the `ds` conda env
already has `playwright` installed with browsers pre-cached, and this project's convention for
Python tooling (`extras/log_effort.py`, the `topdf` skill, `generate_security_pdf.py`) is to use
that env rather than add a parallel npm toolchain. No `pytest`/`pytest-playwright` in `ds`
either, so specs are plain scripts (`TESTS = [...]` list of functions, `assert`-based), run via:

```bash
npm run dev                        # in one terminal — or a production build
conda run -n ds python e2e/run.py  # in another; discovers and runs every e2e/test_*.py
```

`BASE_URL` env var overrides the default `http://localhost:3000` (CI points it at a locally
built-and-started server using Preview env vars, not a live Vercel Preview deployment URL —
avoids depending on Vercel's own deployment-webhook timing). Seed-data constants in
`e2e/_common.py` (`SEED_ADMIN_EMAIL`, `SEED_SONG_TITLE`, etc.) must be kept in sync with
`prisma/seed.ts` by hand if that file's demo data ever changes.

**CI requires a `VERCEL_TOKEN` repository secret** (Vercel dashboard → Account Settings →
Tokens) — `vercel tokens add` couldn't mint one from this session (403: the Claude Vercel
plugin's own OAuth grant isn't permitted to create new tokens, a deliberate scope restriction,
not a bug to route around). The app owner generated one manually and it was set via `gh secret
set VERCEL_TOKEN` — verified working end-to-end (pulled real Preview env vars) before relying
on it. `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` in the workflow file are plain identifiers, not
secrets — same values as the gitignored `.vercel/project.json`.

**Explicitly out of scope for this pass** (per #44's own framing as a spike — scope/tooling
decided when picked up, not fully built out): promotion gating beyond "PR can't merge without
green CI" (no automatic Vercel-Preview-to-Production promotion step), broader golden-path
coverage (member invite/role changes, sheet-music upload, logistics/travel pages), and visual
regression testing. Extend `e2e/` incrementally as more golden paths need covering.

---

## Deployment

Live at **https://umoja-voices.vercel.app**. Vercel project `egm2/umoja-voices`, GitHub-connected
(pushes to `main` auto-deploy). Database: Supabase Postgres, connected via Vercel's Supabase
Marketplace integration (`vercel integration add supabase`) rather than by hand-typing
connection strings — see the "Database" stand-in note above for why.

### Environment isolation: Production vs. Preview/Development (closed #52, v0.23.0)

Two separate Supabase projects exist:

- **Production** (`tpsvwjeyncgbmuxflizi` / "supabase-celeste-forest", us-east-1) — the one
  auto-provisioned by `vercel integration add supabase`; only the Production-scoped Vercel env
  vars point here. Real member/song data lives here.
- **Preview + Development** (`icmqcqmqvuqyzrjwxfcb` / "Umoja Voices", eu-west-1) — a Supabase
  project that had actually existed since project setup (created directly on supabase.com a few
  hours before the Vercel integration provisioned the other one — the exact "don't connect an
  existing project" gotcha below), sitting empty and unused until #52 repurposed it. Schema
  applied via the same `prisma/migrations` this app already tracks; seeded via the normal
  `prisma/seed.ts` (admin + Demo Chorister + placeholder song/trip — no real data). Has its own
  `song-audio`/`song-sheet-music` Storage buckets (`npm run storage:setup`).

**Vercel env var scoping**: `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`
(the only five vars this codebase actually reads — see `src/lib/prisma.ts`, `prisma.config.ts`,
`src/lib/supabase/*.ts`) are scoped **per environment**: Production keeps its original value,
Preview and Development point at the non-production project. The other Marketplace-provisioned
vars (`POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `POSTGRES_URL`,
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are unread by any app code and were
deliberately left alone (still shared/Production-valued) rather than migrated for symmetry with
no functional benefit.

**Non-production project's Postgres role**: rather than the `postgres` superuser role (whose
password isn't resettable via the Management API or CLI — see gotcha below), a dedicated
`app_owner` role owns the schema (`GRANT CREATE, USAGE ON SCHEMA public`, default privileges on
future tables/sequences). Its pooler username is `app_owner.icmqcqmqvuqyzrjwxfcb` (Supavisor's
`<role>.<project-ref>` convention, not just the ref).

**Keeping schema in sync**: whenever a new Prisma migration is created, apply it to **both**
projects — `prisma migrate dev` (or `deploy`) against Production as usual, and separately
`prisma migrate deploy` against the non-production project using its own `DATABASE_URL`/
`DIRECT_URL` (override, don't edit, `.env`/`.env.local` — see the "safe env override" gotcha
below). Local dev's `.env`/`.env.local` should always be pulled from Vercel's Development
environment (`vercel env pull .env` / `.env.local`, no `--environment` flag needed since
Development is the default), which now correctly resolves to the non-production project.

**Not automated (manual dashboard step, deliberately not scripted)**: the non-production
project's Supabase Auth Site URL / redirect-URL allow-list isn't configured yet. Automating this
via `supabase config push` was considered and rejected — it pushes the *entire* `config.toml`,
risking overwriting unrelated project settings for a nice-to-have (only matters for testing
invite/reset email links against Preview, not for the core data-isolation goal of #52). Set it by
hand in the dashboard (Authentication → URL Configuration) if/when Preview-tested auth-link flows
are actually needed.

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
- **`vercel env rm <name> <one-environment>` can delete the variable from *every* environment,
  not just the one named**, when the existing value was originally added as a single record
  spanning multiple environments (e.g. `Production, Preview, Development` all sharing one value
  — exactly how the Supabase Marketplace integration provisions everything). Confirmed directly:
  running it against just `preview` deleted `NEXT_PUBLIC_SUPABASE_URL` from Production too,
  breaking it for a few seconds until restored (harmless in practice, since Vercel bakes env vars
  into a deployment at build time — an already-running deployment doesn't pick up the change
  until its next build/redeploy — but still a real mistake, not a safe operation to repeat).
  **The safe way to give one environment a different value: skip `rm` entirely and go straight
  to `vercel env add <name> <environment> --value ... --force --yes`** — this correctly *splits*
  the target environment into its own record with the new value, leaving the other
  environments' existing record/value untouched. Verified this repeatedly across 5 variables
  with zero impact to Production each time.
- **Supabase blocks `ALTER USER postgres WITH PASSWORD ...` via the Management API's SQL proxy**
  (`supabase db query --linked`) with "permission denied to alter role... Only superusers can
  alter privileged roles" — a deliberate protection on the primary role, not a bug to route
  around (e.g. by trying to escalate further). If you need write access to a Supabase project
  without knowing/resetting its `postgres` password, `CREATE ROLE <name> WITH LOGIN PASSWORD
  '...' CREATEDB NOSUPERUSER` works fine via the same `db query --linked` — create your own
  non-privileged role instead of touching `postgres`.
- **A Supabase project's direct connection host (`db.<ref>.supabase.co:5432`) is IPv6-only by
  default on newer projects** — `prisma migrate deploy` against it fails with `P1001: Can't reach
  database server`, even with real network access and correct credentials. Use the pooler host
  for both connections instead, exactly as `.env.example` already documents: port `5432` on
  `aws-0-<region>.pooler.supabase.com` (session mode) for the direct/migration URL, port `6543`
  (`?pgbouncer=true`) for the pooled/app URL — with username `<role>.<project-ref>`, not just
  `<role>`.
- **Piping a value between two `npx <tool>` invocations in one shell pipeline can silently drop
  stdin** (`echo ... | npx supabase ... | npx vercel env add ...` reported `missing_value` even
  though the upstream command visibly produced output). Write the value to a file first, then
  `cat file | npx vercel env add ...` — reliable every time, and also means a secret value never
  has to appear in anything this session reads back to verify it worked.
- **This sandbox has no raw network access by default** (DNS to Supabase/GitHub hosts fails) —
  every `supabase`/`vercel` CLI call, and any `prisma migrate`/`pg` connection, needs Bash's
  `dangerouslyDisableSandbox: true`. Confirm with the user before disabling it for anything that
  writes to a real cloud resource, same as for `prisma migrate dev` against production.
- **`prisma.config.ts` loads `.env` then `.env.local` with `override: true`** — this is the "safe
  env override" gotcha referenced above under "Keeping schema in sync". `.env.local`'s own value
  for any key it defines (`POSTGRES_URL_NON_POOLING`, etc.) always wins over `.env`'s, even if you
  set that key at the shell level (`env VAR=... npx prisma ...`) before running the command — a
  plain shell prefix is **not** enough to target Production, since `.env.local` still clobbers it
  right back to Preview. The only reliable way to actually run a Production-targeting Prisma
  command from this repo is to temporarily move `.env.local` out of the way for that one command:
  `mv .env.local .env.local.tmp && npx prisma migrate deploy; mv .env.local.tmp .env.local`.
- **A local `.env` file's contents can go stale without any obvious signal** (found 2026-07-22,
  #59) — this repo's `.env` had drifted to actually contain the *Preview* project's credentials
  mislabeled as Production (both connect fine, both return "success", so nothing errors). A
  `prisma migrate deploy` run against it appeared to work, but had silently re-applied to Preview
  (which already had the migration) while real Production never received it — only surfacing once
  the deployed app hit a live `500`/`P2021` "table does not exist". Before running anything
  against "Production" using a local `.env` file that's more than a session or two old, verify it
  first: `vercel env pull /tmp/check.env --environment=production` and diff the connection-string
  host/project-ref against what's already in `.env`.

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
prisma/schema.prisma                 ← data model (Postgres/Supabase; see file header for the enum note)
prisma/seed.ts                       ← demo data: admin + Demo Chorister + one placeholder song/trip
extras/umoja_technical_document.md   ← gitignored; single living source — as-built reference,
                                        design process, and cost record, updated with each issue
extras/umoja_technical_document.pdf  ← gitignored; rendered from the above via the `topdf` skill
extras/effort.xlsx                   ← gitignored; hours log, see "Effort tracking" above
Media/                               ← gitignored permanently; real WhatsApp export, never committed
```
