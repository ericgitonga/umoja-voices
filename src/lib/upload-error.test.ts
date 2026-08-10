import { describe, expect, it } from "vitest";
import { describeUploadFailure } from "@/lib/upload-error";

const NETWORK_MESSAGE =
  "Upload failed — the connection was interrupted before it finished. This is common on a slow or unstable network with larger files. Check your connection and try again, ideally on Wi-Fi.";
const GENERIC_MESSAGE = "Something went wrong — please try again.";

describe("describeUploadFailure", () => {
  it.each([
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    "Load failed",
    "net::ERR_CONNECTION_RESET",
  ])("recognizes a %s error as a network failure", (message) => {
    expect(describeUploadFailure(new Error(message))).toBe(NETWORK_MESSAGE);
  });

  it("is case-insensitive when matching known network error substrings", () => {
    expect(describeUploadFailure(new Error("FAILED TO FETCH"))).toBe(NETWORK_MESSAGE);
  });

  it("falls back to the generic message for an unrelated error", () => {
    expect(describeUploadFailure(new Error("Validation failed: title is required"))).toBe(GENERIC_MESSAGE);
  });

  it("falls back to the generic message for a non-Error thrown value", () => {
    expect(describeUploadFailure("some string failure")).toBe(GENERIC_MESSAGE);
  });

  it("falls back to the generic message for an undefined thrown value", () => {
    expect(describeUploadFailure(undefined)).toBe(GENERIC_MESSAGE);
  });
});
