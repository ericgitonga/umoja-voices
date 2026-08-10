import { describe, expect, it } from "vitest";
import { parseLyricsPaste, serializeLyricsForEdit } from "@/lib/lyrics-parser";

describe("parseLyricsPaste", () => {
  it("splits blank-line-separated blocks into sections, defaulting to SATB", () => {
    const sections = parseLyricsPaste("Verse 1\nLine one\nLine two\n\nChorus\nLine three");
    expect(sections).toEqual([
      { sectionType: "verse", sectionLabel: "Verse 1", content: "Line one\nLine two", voiceTags: ["SATB"] },
      { sectionType: "chorus", sectionLabel: "Chorus", content: "Line three", voiceTags: ["SATB"] },
    ]);
  });

  it("infers custom for a label that doesn't match a known section type", () => {
    const [section] = parseLyricsPaste("Interlude\nSome text");
    expect(section.sectionType).toBe("custom");
  });

  it("strips an explicit voice tag from its line and applies it to the section", () => {
    const [section] = parseLyricsPaste("Verse 1\n[S] Soprano line");
    expect(section.voiceTags).toEqual(["S"]);
    expect(section.content).toBe("Soprano line");
  });

  it("normalizes [ALL] to SATB", () => {
    const [section] = parseLyricsPaste("Verse 1\n[ALL] Everyone sings");
    expect(section.voiceTags).toEqual(["SATB"]);
  });

  it("carries an explicit tag forward across subsequent sections with no tag of their own", () => {
    const sections = parseLyricsPaste("Verse 1\n[T] Tenor line\n\nVerse 2\nNo tag here");
    expect(sections[0].voiceTags).toEqual(["T"]);
    expect(sections[1].voiceTags).toEqual(["T"]);
  });

  it("lets a later explicit tag override the carried-forward one", () => {
    const sections = parseLyricsPaste("Verse 1\n[T] Tenor line\n\nVerse 2\n[B] Bass line");
    expect(sections[0].voiceTags).toEqual(["T"]);
    expect(sections[1].voiceTags).toEqual(["B"]);
  });

  it("is case-insensitive when matching voice tags", () => {
    const [section] = parseLyricsPaste("Verse 1\n[s] lowercase tag");
    expect(section.voiceTags).toEqual(["S"]);
  });

  it("ignores extra blank lines between blocks", () => {
    const sections = parseLyricsPaste("Verse 1\nLine one\n\n\n\nChorus\nLine two");
    expect(sections).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(parseLyricsPaste("")).toEqual([]);
  });

  it("skips a block that's just whitespace", () => {
    expect(parseLyricsPaste("Verse 1\nLine one\n\n   \n\nChorus\nLine two")).toHaveLength(2);
  });
});

describe("serializeLyricsForEdit", () => {
  it("re-tags the first line of each section explicitly", () => {
    const result = serializeLyricsForEdit([
      { sectionLabel: "Verse 1", content: "Line one\nLine two", voiceTags: ["S"] },
    ]);
    expect(result).toBe("Verse 1\n[S] Line one\nLine two");
  });

  it("defaults to SATB when a section has no voice tags", () => {
    const result = serializeLyricsForEdit([{ sectionLabel: "Chorus", content: "Everyone", voiceTags: [] }]);
    expect(result).toBe("Chorus\n[SATB] Everyone");
  });

  it("joins multiple sections with a blank line", () => {
    const result = serializeLyricsForEdit([
      { sectionLabel: "Verse 1", content: "Line one", voiceTags: ["S"] },
      { sectionLabel: "Chorus", content: "Line two", voiceTags: ["SATB"] },
    ]);
    expect(result).toBe("Verse 1\n[S] Line one\n\nChorus\n[SATB] Line two");
  });

  it("round-trips through parseLyricsPaste", () => {
    const original = parseLyricsPaste("Verse 1\n[T] Tenor line\n\nVerse 2\n[B] Bass line");
    const reparsed = parseLyricsPaste(serializeLyricsForEdit(original));
    expect(reparsed).toEqual(original);
  });
});
