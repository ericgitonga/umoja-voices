# Umoja Voices

Choir management app: a song library with per-voice-part media and structured, voice-tagged
lyrics, admin/chorister accounts with an invite-only signup flow, a travel logistics module,
and a public external links page.

See `umoja.pdf` for the full, reviewed design plan and `SKILL.md` for this project's
versioning/tracking protocol, security posture, and data-handling rules.

## Local development (POC)

The POC runs on local SQLite + NextAuth Credentials as a stand-in for the design's target
Supabase Postgres + Supabase Auth (see `SKILL.md`'s Security First section for why).

```bash
npm install
cp .env.example .env   # then fill in a real NEXTAUTH_SECRET
npx prisma migrate dev
npm run db:seed
npm run dev
```

Seeded dev logins (printed by `npm run db:seed`):
- Admin: `gitonga@earthranger.com` / `admin12345`
- Chorister: `demo.chorister@example.com` / `chorister12345`

Open [http://localhost:3000](http://localhost:3000).
