import { beforeEach, describe, expect, it, vi } from "vitest";
import { isOwnAnyMediaUrl } from "@/lib/media-dispatch";

const SUPABASE_URL = "https://project-ref.supabase.co";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
});

describe("isOwnAnyMediaUrl", () => {
  it("recognizes a URL in our own audio bucket", () => {
    expect(isOwnAnyMediaUrl(`${SUPABASE_URL}/storage/v1/object/public/song-audio/track.mp3`)).toBe(true);
  });

  it("recognizes a URL in our own video bucket", () => {
    expect(isOwnAnyMediaUrl(`${SUPABASE_URL}/storage/v1/object/public/song-video/clip.mp4`)).toBe(true);
  });

  it("rejects a URL pointed at a different Supabase project", () => {
    expect(isOwnAnyMediaUrl("https://other-project.supabase.co/storage/v1/object/public/song-audio/track.mp3")).toBe(
      false
    );
  });

  it("rejects an unrelated external URL", () => {
    expect(isOwnAnyMediaUrl("https://youtube.com/watch?v=abc123")).toBe(false);
  });
});
