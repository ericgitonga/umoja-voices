import { describe, expect, it } from "vitest";
import { clip, oneOf, oneOfOrNull, safeRedirectPath, subsetOf } from "@/lib/validation";

describe("clip", () => {
  it("leaves a value under the max length untouched", () => {
    expect(clip("hello", "name")).toBe("hello");
  });

  it("truncates a value over the max length for its kind", () => {
    const long = "a".repeat(250);
    expect(clip(long, "name")).toBe("a".repeat(200));
  });

  it("uses the max length specific to the given kind", () => {
    const long = "a".repeat(50);
    expect(clip(long, "phone")).toBe("a".repeat(30));
  });
});

describe("oneOf", () => {
  const allowed = ["admin", "chorister"] as const;

  it("returns the value when it's in the allowed list", () => {
    expect(oneOf("admin", allowed, "chorister")).toBe("admin");
  });

  it("returns the fallback when the value isn't in the allowed list", () => {
    expect(oneOf("superadmin", allowed, "chorister")).toBe("chorister");
  });

  it("returns the fallback for an empty string", () => {
    expect(oneOf("", allowed, "chorister")).toBe("chorister");
  });
});

describe("oneOfOrNull", () => {
  const allowed = ["visa", "tickets", "payment", "other"] as const;

  it("returns the value when it's in the allowed list", () => {
    expect(oneOfOrNull("visa", allowed)).toBe("visa");
  });

  it("returns null when the value isn't in the allowed list", () => {
    expect(oneOfOrNull("unknown", allowed)).toBeNull();
  });
});

describe("subsetOf", () => {
  const allowed = ["S", "A", "T", "B"] as const;

  it("keeps only values present in the allowed list", () => {
    expect(subsetOf(["S", "X", "T", "Y"], allowed)).toEqual(["S", "T"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(subsetOf(["X", "Y"], allowed)).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(subsetOf([], allowed)).toEqual([]);
  });
});

describe("safeRedirectPath", () => {
  it("accepts a same-origin path", () => {
    expect(safeRedirectPath("/accept-invite", "/")).toBe("/accept-invite");
  });

  it("rejects a protocol-relative path (off-site despite the leading slash)", () => {
    expect(safeRedirectPath("//evil.com", "/")).toBe("/");
  });

  it("rejects a path that doesn't start with a slash", () => {
    expect(safeRedirectPath("evil.com", "/")).toBe("/");
  });

  it("rejects a full URL", () => {
    expect(safeRedirectPath("https://evil.com", "/")).toBe("/");
  });
});
