import { describe, expect, it, vi } from "vitest";

// rate-limit.ts imports prisma.ts at module scope, which throws immediately
// if no DATABASE_URL is set — irrelevant to getClientIp (the only pure
// export here), so stub it out rather than requiring a real connection
// string just to load the module under test.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { getClientIp } = await import("@/lib/rate-limit");

describe("getClientIp", () => {
  it("prefers x-forwarded-for from a Headers-like source", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("203.0.113.5");
  });

  it("takes only the first hop from a multi-value x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.5 , 10.0.0.1, 10.0.0.2" });
    expect(getClientIp(headers)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.9" });
    expect(getClientIp(headers)).toBe("198.51.100.9");
  });

  it("falls back to a constant when no proxy header is present", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("accepts a plain header record (e.g. NextAuth's authorize callback)", () => {
    expect(getClientIp({ "x-forwarded-for": "203.0.113.5" })).toBe("203.0.113.5");
  });

  it("takes the first element when a plain record's header value is an array", () => {
    expect(getClientIp({ "x-forwarded-for": ["203.0.113.5", "10.0.0.1"] })).toBe("203.0.113.5");
  });

  it("falls back to a constant for a plain record with no relevant header", () => {
    expect(getClientIp({})).toBe("unknown");
  });
});
