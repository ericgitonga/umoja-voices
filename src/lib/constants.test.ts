import { describe, expect, it } from "vitest";
import { detectMediaKind, parseVoiceTags, serializeVoiceTags } from "@/lib/constants";

describe("parseVoiceTags", () => {
  it("parses a comma-separated list of valid tags", () => {
    expect(parseVoiceTags("S,A,T,B")).toEqual(["S", "A", "T", "B"]);
  });

  it("trims whitespace around each tag", () => {
    expect(parseVoiceTags(" S , A ")).toEqual(["S", "A"]);
  });

  it("drops any tag not in the known VOICE_TAGS set", () => {
    expect(parseVoiceTags("S,X,T")).toEqual(["S", "T"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseVoiceTags("")).toEqual([]);
  });
});

describe("serializeVoiceTags", () => {
  it("joins multiple tags with a comma", () => {
    expect(serializeVoiceTags(["S", "A"])).toBe("S,A");
  });

  it("defaults to SATB for an empty list", () => {
    expect(serializeVoiceTags([])).toBe("SATB");
  });
});

describe("detectMediaKind", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123", "youtube"],
    ["https://youtu.be/abc123", "youtube"],
    ["https://drive.google.com/file/d/abc123", "drive"],
    ["https://soundcloud.com/artist/track", "soundcloud"],
    ["https://example.com/song.mp3", "audio"],
    ["https://example.com/song.wav?token=abc", "audio"],
    ["https://example.com/clip.mp4", "video"],
    ["https://example.com/clip.mov", "video"],
    ["https://example.com/page.html", "direct_url"],
  ])("classifies %s as %s", (url, expected) => {
    expect(detectMediaKind(url)).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(detectMediaKind("HTTPS://YOUTUBE.COM/WATCH?V=ABC")).toBe("youtube");
  });
});
