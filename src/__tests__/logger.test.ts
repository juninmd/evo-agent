import { describe, expect, it } from "vitest";
import { redactLogValue } from "../utils/logger.js";

describe("structured logger redaction", () => {
  it("redacts bearer tokens and credential-like assignments", () => {
    expect(redactLogValue("Authorization: Bearer secret-token")).not.toContain(
      "secret-token",
    );
    expect(redactLogValue("GITHUB_TOKEN=abc123")).toBe(
      "GITHUB_TOKEN=[REDACTED]",
    );
  });
});
