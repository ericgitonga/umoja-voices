import type { NextConfig } from "next";

// Content-Security-Policy is NOT set here (#17) — it needs a fresh nonce
// per request, generated in src/proxy.ts and set on every response there
// instead. These headers don't vary per request, so they stay static.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    serverActions: {
      // Default is 1MB. Audio/video uploads (#36, #55) are capped at 20MB
      // app-side (src/lib/storage.ts, src/lib/video-storage.ts) — this must
      // cover that plus multipart overhead (boundaries/part headers), hence
      // the headroom above 20MB.
      bodySizeLimit: "22mb",
    },
    // #58: src/proxy.ts (this app's global middleware, broadened to every
    // route for #17's per-request CSP nonce) clones and buffers every
    // request body it sees — separately from, and in front of,
    // serverActions.bodySizeLimit above. Its own default cap is 10MB, well
    // under this app's 20MB upload cap, so any upload over 10MB (routinely
    // hit by video, occasionally by audio/sheet-music) got silently
    // truncated by the proxy — never rejected with a clear error — and the
    // Server Action then failed downstream trying to parse the now-broken
    // multipart body ("Error: Unexpected end of form"), surfacing to the
    // user as a generic "Something went wrong." Confirmed directly: a 14MB
    // test upload reproduced the exact bug locally with a fast connection
    // and no throttling — this was a body-size ceiling, not a network
    // flakiness issue. Matches serverActions.bodySizeLimit above so the
    // proxy's buffer is never the one clipping an upload this app already
    // considers valid.
    proxyClientMaxBodySize: "22mb",
  },
};

export default nextConfig;
