import { describe, expect, it } from "vitest";
import { isSafeExternalUrl } from "../utils/url.js";

describe("isSafeExternalUrl", () => {
  it("accepts public HTTPS sources", () => {
    expect(isSafeExternalUrl("https://example.com/feed.xml")).toBe(true);
  });

  it("rejects local, private, and non-HTTPS targets", () => {
    expect(isSafeExternalUrl("http://example.com/feed.xml")).toBe(false);
    expect(isSafeExternalUrl("https://localhost/feed")).toBe(false);
    expect(isSafeExternalUrl("https://127.0.0.1/feed")).toBe(false);
    expect(isSafeExternalUrl("https://10.0.0.5/feed")).toBe(false);
    expect(isSafeExternalUrl("https://service.internal/feed")).toBe(false);
  });
});
