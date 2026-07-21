/**
 * Lightweight, dependency-free User-Agent parsing (#49) — just enough to
 * show "Chrome on macOS"-style context next to an audit-log entry. Deliberately
 * not a full parser library (ua-parser-js etc.): the raw string is what's
 * actually stored (`ActivityLog.userAgent`), this only derives a friendly
 * label for display, so a missed edge case degrades to "Unknown", never a
 * wrong stored value.
 */
export function parseUserAgent(userAgent: string | null): { browser: string; os: string } {
  if (!userAgent) return { browser: "Unknown", os: "Unknown" };
  const ua = userAgent;

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";

  // Order matters: Edge/Opera/mobile Chrome UAs all also contain "Safari"/
  // "Chrome" tokens for legacy compatibility, so the more specific token must
  // be checked first.
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /CriOS\//.test(ua)
          ? "Chrome"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Unknown";

  return { browser, os };
}
