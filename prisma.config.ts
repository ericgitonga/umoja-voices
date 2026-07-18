import "dotenv/config";
import { defineConfig } from "prisma/config";

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
