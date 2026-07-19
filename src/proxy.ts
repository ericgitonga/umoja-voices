import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Do not run code between createServerClient() and getClaims() — Supabase's
  // own docs warn a stray call here can cause random logouts.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const role = (claims.app_metadata as { role?: string } | undefined)?.role;

  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/songs", request.url));
  }

  // Must return supabaseResponse as-is (or copy its cookies onto a
  // replacement) or the browser/server session go out of sync.
  return supabaseResponse;
}

export const config = {
  matcher: ["/songs/:path*", "/links/:path*", "/logistics/:path*", "/profile/:path*", "/admin/:path*"],
};
