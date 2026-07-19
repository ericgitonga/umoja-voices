import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for admin-only operations (auth.admin.*) — invite
 * creation, role/status sync to app_metadata, forced sign-out, deletion.
 * Uses SUPABASE_SECRET_KEY, never exposed to the browser. Never import
 * this from a client component.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
