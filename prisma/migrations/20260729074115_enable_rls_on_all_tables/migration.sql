-- Enable Row Level Security on every public table, flagged CRITICAL by
-- Supabase's Security Advisor (rls_disabled_in_public): with RLS off,
-- anyone with the project URL and anon key can read/write/delete all data
-- in these tables via Supabase's auto-generated PostgREST API.
--
-- No policies are added because none are needed: this app never queries
-- these tables through the Supabase JS client / PostgREST (confirmed by
-- grepping src/ for `.from(` against every table name below — the only
-- `.from(` calls are Storage bucket access, unrelated to Postgres tables).
-- Prisma is the sole access path, connecting via Supabase's privileged
-- `postgres` role (POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING), which
-- bypasses RLS entirely — so enabling RLS with zero permissive policies
-- closes the public PostgREST hole without touching any real code path.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Song" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongSheetMusic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LyricSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LogisticsDeadline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ItineraryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AboutPageSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AboutPageMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
