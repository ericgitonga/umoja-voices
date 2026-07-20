import type { NextConfig } from "next";

// frame-src must cover every domain MediaEmbed.tsx can render an <iframe> for.
const FRAME_SRC = [
  "'self'",
  "https://www.youtube.com",
  "https://drive.google.com",
  "https://w.soundcloud.com",
].join(" ");

const CSP = [
  "default-src 'self'",
  // Next.js App Router streams RSC hydration data via inline <script> tags
  // on every page load (confirmed by testing: 'self' alone breaks the app
  // entirely, not just dev-mode HMR). The correct long-term fix is a
  // per-request nonce threaded from middleware into the root layout
  // (Next's documented CSP pattern) — tracked as a follow-up rather than
  // done here, since it requires moving header generation into
  // src/proxy.ts. No known XSS sink exists in this app today (no
  // dangerouslySetInnerHTML, no raw HTML rendering of user input — see
  // extras/security.pdf), so 'unsafe-inline' is an accepted, documented
  // trade-off for now rather than a silent gap.
  // 'unsafe-eval' is dev-only (React's debug tooling uses eval() to
  // reconstruct stack traces in development; it never runs in production).
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
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

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    serverActions: {
      // Default is 1MB. Audio uploads (#36) are capped at 20MB app-side
      // (src/lib/storage.ts) — this must cover that plus multipart overhead
      // (boundaries/part headers), hence the headroom above 20MB.
      bodySizeLimit: "22mb",
    },
  },
};

export default nextConfig;
