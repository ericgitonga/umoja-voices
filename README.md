# Umoja Voices

Choir management app: a song library with per-voice-part media and structured, voice-tagged
lyrics, admin/chorister accounts with an invite-only signup flow, a travel logistics module,
a public external links page, and an admin-configurable About page (ordered text sections and
media, freely interleaved).

Live at **https://umoja-voices.vercel.app**.

See `extras/umoja_technical_document.pdf` for the full technical reference and `SKILL.md` for this project's
versioning/tracking protocol, security posture, and data-handling rules (including deployment
gotchas worth reading before touching the Vercel/Supabase setup again).

For a full walkthrough of how to use the app, see [`docs/User Guide.pdf`](docs/User%20Guide.pdf).

## Local development

The database runs on Supabase Postgres; auth is Supabase Auth (see `SKILL.md`'s Security First
section). **Local dev and Vercel Preview deployments use a separate, non-production Supabase
project** — never the live production one — per #52 (see `SKILL.md`'s Deployment section for
the full rationale and how the two projects are kept schema-in-sync).

```bash
npm install

# The Vercel project is already linked; this pulls the Development-scoped
# env vars, which point at the non-production Supabase project — not the
# live one production traffic uses:
vercel env pull .env
vercel env pull .env.local

# Otherwise, copy .env.example and fill in DATABASE_URL/DIRECT_URL by hand
# from Supabase's dashboard for the non-production project, plus a real
# NEXTAUTH_SECRET.

npx prisma migrate deploy   # applies any migrations not yet on this DB
npm run storage:setup       # creates the song-audio / song-sheet-music / song-video Storage buckets
npm run db:seed
npm run dev
```

`npm run db:seed` creates two accounts — an admin (`gitonga@gmail.com`) and a fictitious demo
chorister (`demo.chorister@example.com`) — and prints their initial passwords to the console
at seed time (not written here, since this file is public). Both force a password change on
first login.

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

Deployed via `vercel deploy --prod` from the linked project (`egm2/umoja-voices`), with GitHub
connected so pushes to `main` auto-deploy too. `NEXTAUTH_SECRET`/`NEXTAUTH_URL` are set directly
in the Vercel project's Environment Variables.

Database/Supabase env vars (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) are
scoped **per environment** in Vercel, not shared across all three (#52): Production points at
the live Supabase project; Preview and Development point at a separate non-production project.
Whenever the schema changes, apply the new migration to **both** projects — see `SKILL.md`'s
Deployment section for the exact commands and gotchas (in particular: the non-production
project's direct/migration connection must go through the pooler host on port 5432, not the
raw `db.<ref>.supabase.co` host, which is IPv6-only by default).

The build itself never touches the database (every Prisma-backed page is `export const dynamic
= "force-dynamic"`, so nothing is prerendered against live data at build time) — only requests
at runtime do.
