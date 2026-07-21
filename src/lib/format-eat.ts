const EAT_TIME_ZONE = "Africa/Nairobi"; // UTC+3, no DST

const EAT_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: EAT_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Formats a timestamp in East Africa Time regardless of the server's own
 * runtime timezone (Vercel's Node runtime defaults to UTC) — this app's
 * convention for admin-facing timestamps (#49).
 */
export function formatEAT(date: Date): string {
  return `${EAT_FORMATTER.format(date)} EAT`;
}
