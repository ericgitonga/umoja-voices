# Umoja Voices

Choir management app: a song library with per-voice-part media and structured, voice-tagged
lyrics, admin/chorister accounts with an invite-only signup flow, a travel logistics module,
and a public external links page.

See `umoja.pdf` for the full, reviewed design plan and `SKILL.md` for this project's
versioning/tracking protocol, security posture, and data-handling rules.

## Local development

The database runs on Supabase Postgres. Auth is still NextAuth Credentials, a stand-in for
Supabase Auth (see `SKILL.md`'s Security First section and issue #10 for that migration's
remaining scope).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL/DIRECT_URL from your Supabase project, and a real NEXTAUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Seeded dev logins (printed by `npm run db:seed`):
- Admin: `gitonga@gmail.com` / `admin12345`
- Chorister: `demo.chorister@example.com` / `chorister12345`

Both force a password change on first login.

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

Set the same env vars (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` set to
the deployed URL) in the Vercel project's Environment Variables settings. The build itself
never touches the database (every Prisma-backed page is `export const dynamic =
"force-dynamic"`, so nothing is prerendered against live data at build time) — only requests
at runtime do.
