import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Point it at Supabase's pooled connection string " +
      "(Project Settings -> Database -> Connection string -> Transaction pooler) — " +
      "see .env.example."
  );
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
