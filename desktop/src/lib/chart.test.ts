import { describe, expect, it } from "vitest";
import {
  areaPath,
  durationTicks,
  linePath,
  linearScale,
  nearestIndex,
  niceStep,
  niceTicks,
  percentile,
  seriesStats,
  spreadIndices,
} from "./chart";

describe("linearScale", () => {
  it("maps the domain onto the range, inverted ranges included", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  it("puts a single-value domain in the middle instead of dividing by zero", () => {
    expect(linearScale([5, 5], [0, 80])(5)).toBe(40);
  });
});

describe("niceTicks", () => {
  it("rounds the axis to steps a reader can add up", () => {
    expect(niceStep(51_900, 4)).toBe(20_000);
    expect(niceTicks(9_100, 61_000)).toEqual([
      0, 20_000, 40_000, 60_000, 80_000,
    ]);
    expect(niceTicks(80, 88)).toEqual([80, 82, 84, 86, 88]);
    expect(niceTicks(0.12, 0.47)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it("opens room around a flat series", () => {
    const ticks = niceTicks(300, 300);
    expect(ticks[0]).toBeLessThan(300);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(300);
    expect(niceTicks(0, 0)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });

  it("does not drift with floating point steps", () => {
    for (const tick of niceTicks(0, 0.7, 7)) {
      expect(String(tick).length).toBeLessThanOrEqual(4);
    }
  });

  it("survives values that are not numbers", () => {
    expect(niceTicks(Number.NaN, 3)).toEqual([0, 1]);
  });
});

describe("spreadIndices", () => {
  it("always keeps the first and the last point", () => {
    expect(spreadIndices(8, 4)).toEqual([0, 2, 5, 7]);
    expect(spreadIndices(3, 5)).toEqual([0, 1, 2]);
    expect(spreadIndices(0, 4)).toEqual([]);
    expect(spreadIndices(120, 5)).toEqual([0, 30, 60, 89, 119]);
  });
});

describe("nearestIndex", () => {
  it("snaps the pointer to the closest reading", () => {
    const xs = [0, 10, 20, 30];
    expect(nearestIndex(xs, -5)).toBe(0);
    expect(nearestIndex(xs, 4)).toBe(0);
    expect(nearestIndex(xs, 6)).toBe(1);
    expect(nearestIndex(xs, 24)).toBe(2);
    expect(nearestIndex(xs, 99)).toBe(3);
    expect(nearestIndex([], 3)).toBe(-1);
    expect(nearestIndex([7], 3)).toBe(0);
  });
});

describe("paths", () => {
  it("draws the line and closes the area on the baseline", () => {
    const points = [
      [0, 10],
      [5.126, 2.5],
      [10, 8],
    ] as const;
    expect(linePath(points)).toBe("M0,10L5.13,2.5L10,8");
    expect(areaPath(points, 20)).toBe("M0,10L5.13,2.5L10,8L10,20L0,20Z");
    expect(areaPath([], 20)).toBe("");
  });
});

describe("seriesStats", () => {
  it("summarises a chronological series", () => {
    const stats = seriesStats([
      9100, 15400, 24800, 61000, 22500, 19800, 24300, 21100,
    ]);
    expect(stats).toMatchObject({
      count: 8,
      minimum: 9100,
      maximum: 61000,
      average: 24750,
      p95: 61000,
      last: 21100,
      change: 12000,
    });
    expect(seriesStats([])).toBeNull();
  });

  it("reads a percentile by nearest rank", () => {
    const sorted = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile(sorted, 0.95)).toBe(95);
    expect(percentile(sorted, 0.5)).toBe(50);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("durationTicks", () => {
  it("steps a time axis on clock-friendly values", () => {
    expect(durationTicks(300)).toEqual([0, 120, 240, 360]);
    expect(durationTicks(42)).toEqual([0, 15, 30, 45]);
    expect(durationTicks(3600)).toEqual([0, 1800, 3600]);
    expect(durationTicks(5000)).toEqual([0, 1800, 3600, 5400]);
  });

  it("still has an axis when nothing has a duration", () => {
    expect(durationTicks(0)).toEqual([0, 1]);
    expect(durationTicks(Number.NaN)).toEqual([0, 1]);
  });
});
