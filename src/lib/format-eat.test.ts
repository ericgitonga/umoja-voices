import { describe, expect, it } from "vitest";
import { formatEAT } from "@/lib/format-eat";

describe("formatEAT", () => {
  it("shifts a UTC timestamp forward by the fixed UTC+3 EAT offset", () => {
    expect(formatEAT(new Date("2026-08-10T06:30:00Z"))).toBe("10 Aug 2026, 09:30 EAT");
  });

  it("rolls over to the next calendar day when the UTC+3 shift crosses midnight", () => {
    expect(formatEAT(new Date("2026-08-10T21:30:00Z"))).toBe("11 Aug 2026, 00:30 EAT");
  });

  it("appends the EAT suffix regardless of the server's own runtime timezone", () => {
    expect(formatEAT(new Date("2026-01-01T00:00:00Z"))).toContain("EAT");
  });
});
