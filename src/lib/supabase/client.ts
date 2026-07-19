"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — used for updateUser({password}), signOut(),
 *  and session state in client components (Nav, accept-invite, reset-password). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
