# Umoja Voices

Choir management app: a song library with per-voice-part media and structured, voice-tagged
lyrics, admin/chorister accounts with an invite-only signup flow, a travel logistics module,
and a public external links page.

Live at **https://umoja-voices.vercel.app**.

See `umoja.pdf` for the full, reviewed design plan and `SKILL.md` for this project's
versioning/tracking protocol, security posture, and data-handling rules (including deployment
gotchas worth reading before touching the Vercel/Supabase setup again).

## Local development

The database runs on Supabase Postgres. Auth is still NextAuth Credentials, a stand-in for
Supabase Auth (see `SKILL.md`'s Security First section and issue #10 for that migration's
remaining scope).

```bash
npm install

# If the Vercel project is already linked and connected to Supabase (it is —
# see SKILL.md's Deployment section), just pull real values:
vercel env pull .env

# Otherwise, copy .env.example and fill in DATABASE_URL/DIRECT_URL by hand
# from Supabase's dashboard, plus a real NEXTAUTH_SECRET.

npx prisma migrate dev --name init   # first time only; already applied to the live DB
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
connected so pushes to `main` auto-deploy too. Database env vars (`POSTGRES_PRISMA_URL`,
`POSTGRES_URL_NON_POOLING`, etc.) are auto-provisioned by Vercel's Supabase Marketplace
integration — no manual copying. `NEXTAUTH_SECRET`/`NEXTAUTH_URL` are set directly in the
Vercel project's Environment Variables.

The build itself never touches the database (every Prisma-backed page is `export const dynamic
= "force-dynamic"`, so nothing is prerendered against live data at build time) — only requests
at runtime do.
