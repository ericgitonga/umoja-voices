import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Only these prefixes need the Supabase auth/role check — everything else
// (login, forgot/reset-password, accept-invite, /auth/confirm, the root
// page) is intentionally public and must never be redirected to /login.
const PROTECTED_PREFIXES = ["/songs", "/links", "/logistics", "/profile", "/admin"];

// frame-src must cover every domain MediaEmbed.tsx can render an <iframe> for.
const FRAME_SRC = ["'self'", "https://www.youtube.com", "https://drive.google.com", "https://w.soundcloud.com"].join(
  " "
);

/**
 * Nonce-based CSP (#17) — replaces the earlier 'unsafe-inline' stand-in.
 * Built here rather than in next.config.ts's static headers() because a
 * fresh nonce must be generated per request (Next's documented pattern:
 * docs/01-app/02-guides/content-security-policy.md). Next.js automatically
 * tags its own framework/hydration scripts and injected styles with this
 * nonce during rendering — nothing in our own JSX needs to reference it,
 * since this app has no manual <Script>/inline-style usage of its own.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // 'strict-dynamic' means CSP3 browsers ignore the 'self' host-source
    // expression here and trust anything loaded by an already-nonced
    // script instead; 'self' stays for older browsers that don't
    // understand 'strict-dynamic' yet (both per Next's documented pattern).
    // 'unsafe-eval' is dev-only (React's debug tooling uses eval() to
    // reconstruct stack traces in development; it never runs in production).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Dev-mode Fast Refresh injects styles without nonce support (per
    // Next's own documented dev/production split for this exact directive)
    // — production gets the real nonce-based restriction.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' data:",
    "font-src 'self' data:",
    // Supabase Auth's browser client (updateUser/signOut/session refresh) needs
    // to reach the project's own API — without this, every call is silently
    // blocked by the browser with only a devtools CSP violation to go on.
    "connect-src 'self' https://tpsvwjeyncgbmuxflizi.supabase.co",
    // Uploaded audio (#36) plays from Supabase Storage's public URL — same
    // domain as connect-src above. Without this, default-src 'self' silently
    // blocks the <audio> tag with only a devtools CSP violation to go on.
    "media-src 'self' https://tpsvwjeyncgbmuxflizi.supabase.co",
    `frame-src ${FRAME_SRC}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  supabaseResponse.headers.set("Content-Security-Policy", csp);

  const pathname = request.nextUrl.pathname;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return supabaseResponse;
  }

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
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          supabaseResponse.headers.set("Content-Security-Policy", csp);
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
    url.searchParams.set("callbackUrl", pathname);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const role = (claims.app_metadata as { role?: string } | undefined)?.role;

  if (isAdminRoute && role !== "admin") {
    const redirect = NextResponse.redirect(new URL("/songs", request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  // Must return supabaseResponse as-is (or copy its cookies onto a
  // replacement) or the browser/server session go out of sync.
  return supabaseResponse;
}

export const config = {
  // Broadened from the auth-gated prefixes alone (#17): a fresh nonce must
  // be issued for every page render, not just protected ones, or public
  // pages (login, forgot-password, accept-invite, /auth/confirm, the root
  // page) would get no CSP at all once it's removed from next.config.ts's
  // static headers(). The Supabase auth/role check above still only runs
  // for PROTECTED_PREFIXES — this match is strictly broader than that.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
