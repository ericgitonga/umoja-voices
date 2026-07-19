// Single source of truth for the string-based "enum" values described in
// prisma/schema.prisma. Keep in sync with that file's field comments.

export const ROLES = ["admin", "chorister"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["invited", "active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const VOICE_PARTS = ["S", "A", "T", "B"] as const;
export type VoicePart = (typeof VOICE_PARTS)[number];

export const SONG_PART_OPTIONS = ["S", "A", "T", "B", "All"] as const;
export type SongPartOption = (typeof SONG_PART_OPTIONS)[number];

export const SONG_PART_LABEL_TEXT: Record<SongPartOption, string> = {
  S: "Soprano",
  A: "Alto",
  T: "Tenor",
  B: "Bass",
  All: "Tutti (full choir)",
};

/** Maps a SongSection/SongMedia "part" onto the corresponding lyrics VoiceTag. */
export const SONG_PART_TO_VOICE_TAG: Record<SongPartOption, VoiceTag> = {
  S: "S",
  A: "A",
  T: "T",
  B: "B",
  All: "SATB",
};

export const MEDIA_KINDS = [
  "audio",
  "video",
  "youtube",
  "drive",
  "soundcloud",
  "direct_url",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const LYRIC_SECTION_TYPES = [
  "verse",
  "chorus",
  "bridge",
  "intro",
  "outro",
  "vamp",
  "custom",
] as const;
export type LyricSectionType = (typeof LYRIC_SECTION_TYPES)[number];

export const VOICE_TAGS = ["S", "A", "T", "B", "SATB"] as const;
export type VoiceTag = (typeof VOICE_TAGS)[number];

/** Display label for a voice tag — "SATB" reads to choristers as "ALL". */
export const VOICE_TAG_LABEL: Record<VoiceTag, string> = {
  S: "S",
  A: "A",
  T: "T",
  B: "B",
  SATB: "ALL",
};

export const LINK_CATEGORIES = ["social", "news", "media", "other"] as const;
export type LinkCategory = (typeof LINK_CATEGORIES)[number];

export const DEADLINE_CATEGORIES = ["visa", "tickets", "payment", "other"] as const;
export type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number];

export function parseVoiceTags(stored: string): VoiceTag[] {
  return stored
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is VoiceTag => (VOICE_TAGS as readonly string[]).includes(t));
}

export function serializeVoiceTags(tags: VoiceTag[]): string {
  return tags.length ? tags.join(",") : "SATB";
}

/** Detects media_kind from a pasted URL; falls back to direct_url. */
export function detectMediaKind(url: string): MediaKind {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("drive.google.com")) return "drive";
  if (u.includes("soundcloud.com")) return "soundcloud";
  if (/\.(mp3|wav|m4a|ogg)(\?.*)?$/.test(u)) return "audio";
  if (/\.(mp4|mov|webm|mpeg)(\?.*)?$/.test(u)) return "video";
  return "direct_url";
}
