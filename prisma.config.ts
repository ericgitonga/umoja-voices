import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations run against Supabase's direct connection (port 5432),
    // not the pooled one — PgBouncer's transaction-mode pooler doesn't
    // support the DDL/prepared-statement patterns migrate needs.
    // src/lib/prisma.ts and prisma/seed.ts use the pooled DATABASE_URL
    // for everything else, which is what Vercel's serverless functions
    // should actually connect through.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
