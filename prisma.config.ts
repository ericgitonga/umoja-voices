import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Mirror Next.js's own env precedence: `.env` first, then `.env.local`
// overriding it — plain `dotenv/config` only reads `.env`, which left this
// file silently using a stale `.env` while `vercel env pull` (Next.js-aware)
// kept refreshing `.env.local` instead.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations run against Supabase's direct (non-pooled) connection —
    // PgBouncer's transaction-mode pooler doesn't support the DDL/prepared
    // -statement patterns migrate needs. POSTGRES_URL_NON_POOLING is what
    // Vercel's Supabase marketplace integration auto-provisions for this;
    // DIRECT_URL is the fallback for projects without that integration.
    url: process.env["POSTGRES_URL_NON_POOLING"] ?? process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
