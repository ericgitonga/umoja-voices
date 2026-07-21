/**
 * Distinguishes a genuinely network-caused Server Action failure (the
 * connection dropped or never completed mid-upload — realistic for a large
 * audio/video file on a slow or unstable mobile connection) from any other
 * thrown error, so the user gets an actionable message instead of a bare
 * "Something went wrong" either way (#58).
 *
 * A dropped/failed fetch surfaces to the browser as a `TypeError` with a
 * browser-specific message ("Failed to fetch" in Chromium, "NetworkError
 * when attempting to fetch resource" in Firefox, "Load failed" in Safari) —
 * there's no single standard message, so this matches on the common
 * substrings across engines rather than one exact string.
 */
export function describeUploadFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const offline = typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine;
  const looksLikeNetworkFailure = offline || /failed to fetch|networkerror|load failed|ERR_/i.test(message);

  return looksLikeNetworkFailure
    ? "Upload failed — the connection was interrupted before it finished. This is common on a slow or unstable network with larger files. Check your connection and try again, ideally on Wi-Fi."
    : "Something went wrong — please try again.";
}
