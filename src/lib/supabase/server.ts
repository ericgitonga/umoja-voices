import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request-bound Supabase client for Server Components/Actions/Route
 * Handlers — respects the calling user's own session via cookies. Server
 * Components can't write cookies (the try/catch below is required for
 * that), so src/proxy.ts refreshes the session cookie on every request
 * instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — safe to ignore, proxy.ts
            // already refreshes the session cookie on every request.
          }
        },
      },
    }
  );
}
