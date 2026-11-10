import { describe, expect, it } from "vitest";
import { seriesCsv } from "./csv";

describe("seriesCsv", () => {
  it("writes the newest-first API points in chronological order", () => {
    expect(
      seriesCsv([
        { value: 21100, labels: {}, recordedAt: "2026-10-17 17:00:00" },
        { value: 9100.5, labels: {}, recordedAt: "2026-10-17 10:00:00" },
      ]),
    ).toBe(
      "recordedAt,value\n2026-10-17 10:00:00,9100.5\n2026-10-17 17:00:00,21100",
    );
    expect(seriesCsv([])).toBe("recordedAt,value");
  });
});
