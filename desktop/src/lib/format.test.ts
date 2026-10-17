import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatDateTime,
  formatDuration,
  formatNumber,
  hostOf,
  metricNumber,
  parseTimestamp,
} from "./format";

describe("parseTimestamp", () => {
  it("reads a SQLite timestamp as UTC", () => {
    expect(parseTimestamp("2026-10-17 12:00:00")?.toISOString()).toBe(
      "2026-10-17T12:00:00.000Z",
    );
  });

  it("keeps an ISO timestamp untouched", () => {
    expect(parseTimestamp("2026-10-17T12:00:00.000Z")?.toISOString()).toBe(
      "2026-10-17T12:00:00.000Z",
    );
  });

  it("returns null for empty and unparsable values", () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("não é data")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("scales the unit with the magnitude", () => {
    expect(formatDuration(0)).toBe("0 s");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(90)).toBe("1 min 30 s");
    expect(formatDuration(120)).toBe("2 min");
    expect(formatDuration(3 * 3600 + 5 * 60)).toBe("3 h 5 min");
  });

  it("shows a dash while the run is still open", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("uses the pt-BR separator", () => {
    expect(formatNumber(1234.567, 1)).toBe("1.234,6");
    expect(formatCount(1234)).toBe("1.234");
    expect(formatCount(null)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("renders day, month, hour and minute", () => {
    expect(formatDateTime("2026-10-17 12:00:00")).toBe("17/10, 09:00");
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("metricNumber", () => {
  it("only accepts numbers from the free-form JSON blob", () => {
    expect(metricNumber({ selected: 5 }, "selected")).toBe(5);
    expect(metricNumber({ selected: "5" }, "selected")).toBeNull();
    expect(metricNumber(undefined, "selected")).toBeNull();
    expect(metricNumber({}, "selected")).toBeNull();
  });
});

describe("hostOf", () => {
  it("drops the scheme and falls back to the raw value", () => {
    expect(hostOf("http://127.0.0.1:8787")).toBe("127.0.0.1:8787");
    expect(hostOf("https://agente.example/api")).toBe("agente.example");
    expect(hostOf("not a url")).toBe("not a url");
  });
});
