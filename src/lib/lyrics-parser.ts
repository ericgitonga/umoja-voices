import { LYRIC_SECTION_TYPES, VOICE_TAGS, type LyricSectionType, type VoiceTag } from "@/lib/constants";

export type ParsedLyricSection = {
  sectionType: LyricSectionType;
  sectionLabel: string;
  content: string;
  voiceTags: VoiceTag[];
};

const TAG_LINE = /^\s*\[(satb|all|s|a|t|b)\]\s*/i;

function normalizeTag(raw: string): VoiceTag {
  const upper = raw.toUpperCase();
  return upper === "ALL" ? "SATB" : (upper as VoiceTag);
}

function inferSectionType(label: string): LyricSectionType {
  const lower = label.trim().toLowerCase();
  const match = LYRIC_SECTION_TYPES.find((t) => t !== "custom" && lower.startsWith(t));
  return match ?? "custom";
}

/**
 * Parses pasted lyrics text into ordered sections.
 *
 * Contract (shown to the user as placeholder text in the paste textarea):
 * - Segments are separated by a blank line.
 * - A segment's first line is its label (e.g. "Verse 1", "Chorus").
 * - Remaining lines may start with a voice tag like [S], [A], [T], [B], or
 *   [ALL] — an explicit tag carries forward across subsequent segments until
 *   a new tag appears. Absent any tag ever, sections default to SATB.
 */
export function parseLyricsPaste(raw: string): ParsedLyricSection[] {
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  let runningTag: VoiceTag = "SATB";
  const sections: ParsedLyricSection[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());
    const [labelLine, ...rest] = lines;
    if (!labelLine) continue;

    let sectionTag: VoiceTag | null = null;
    const contentLines = rest.map((line) => {
      const match = line.match(TAG_LINE);
      if (match) {
        const tag = normalizeTag(match[1]);
        if ((VOICE_TAGS as readonly string[]).includes(tag)) {
          if (sectionTag === null) sectionTag = tag;
          return line.slice(match[0].length);
        }
      }
      return line;
    });

    const resolvedTag: VoiceTag = sectionTag ?? runningTag;
    runningTag = resolvedTag;

    sections.push({
      sectionType: inferSectionType(labelLine),
      sectionLabel: labelLine,
      content: contentLines.join("\n").trim(),
      voiceTags: [resolvedTag],
    });
  }

  return sections;
}

/**
 * Reverses parseLyricsPaste: reconstructs paste-format text from stored
 * sections so an admin can re-edit existing lyrics via the same textarea.
 * Every section's first line is explicitly tagged (even if that tag matches
 * the carried-forward one) so re-parsing round-trips regardless of order.
 */
export function serializeLyricsForEdit(
  sections: { sectionLabel: string; content: string; voiceTags: VoiceTag[] }[]
): string {
  return sections
    .map((s) => {
      const tag = s.voiceTags[0] ?? "SATB";
      const lines = s.content.split("\n");
      const [first, ...rest] = lines;
      const taggedFirst = `[${tag}] ${first ?? ""}`.trim();
      return [s.sectionLabel, taggedFirst, ...rest].join("\n");
    })
    .join("\n\n");
}
