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
      // Default is 1MB. Audio uploads (#36) are capped at 20MB app-side
      // (src/lib/storage.ts) — this must cover that plus multipart overhead
      // (boundaries/part headers), hence the headroom above 20MB.
      bodySizeLimit: "22mb",
    },
  },
};

export default nextConfig;
