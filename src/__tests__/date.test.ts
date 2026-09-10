import { describe, expect, it, vi } from "vitest";

vi.mock("../config.js", () => ({
  config: { timezone: "America/Sao_Paulo" },
}));

const { localDayIso } = await import("../utils/date.js");

describe("localDayIso", () => {
  // The crons fire on config.timezone; deriving the day key from the process's
  // ambient TZ instead made a host without TZ set key editions by the UTC day
  // and republish the whole daily budget around the local day boundary.
  it("keys the day in the configured zone, not the process zone", () => {
    // 02:30 UTC is still the previous day at UTC-3.
    expect(localDayIso(new Date("2026-07-16T02:30:00.000Z"))).toBe(
      "2026-07-15",
    );
    expect(localDayIso(new Date("2026-07-16T03:30:00.000Z"))).toBe(
      "2026-07-16",
    );
  });

  it("honours an explicit zone override", () => {
    const instant = new Date("2026-07-16T02:30:00.000Z");
    expect(localDayIso(instant, "UTC")).toBe("2026-07-16");
    expect(localDayIso(instant, "Pacific/Auckland")).toBe("2026-07-16");
    expect(localDayIso(instant, "America/Los_Angeles")).toBe("2026-07-15");
  });

  it("renders a zero-padded ISO day", () => {
    expect(localDayIso(new Date("2026-01-05T15:00:00.000Z"))).toBe(
      "2026-01-05",
    );
  });
});
