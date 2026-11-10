import { describe, expect, it } from "vitest";
import { chronological, summarizeCycles } from "./cycles";
import type { CycleRun } from "./types";

function run(
  id: number,
  status: CycleRun["status"],
  durationSeconds: number | null,
): CycleRun {
  return {
    id,
    type: "crawl",
    status,
    metrics: {},
    error: null,
    startedAt: "2026-10-17 12:00:00",
    finishedAt: durationSeconds === null ? null : "2026-10-17 12:05:00",
    durationSeconds,
  };
}

describe("summarizeCycles", () => {
  it("rates success over decided runs only", () => {
    const summary = summarizeCycles([
      run(5, "running", null),
      run(4, "succeeded", 300),
      run(3, "failed", 60),
      run(2, "succeeded", 120),
      run(1, "skipped", 0),
    ]);
    expect(summary).toEqual({
      total: 5,
      succeeded: 2,
      failed: 1,
      running: 1,
      skipped: 1,
      successRate: 2 / 3,
      medianSeconds: 60,
      p95Seconds: 300,
    });
  });

  it("has no rate and no duration without a finished run", () => {
    expect(summarizeCycles([run(1, "running", null)])).toMatchObject({
      successRate: null,
      medianSeconds: null,
      p95Seconds: null,
    });
    expect(summarizeCycles([]).total).toBe(0);
  });
});

describe("chronological", () => {
  it("reverses the newest-first list without touching it", () => {
    const runs = [run(2, "succeeded", 1), run(1, "failed", 2)];
    expect(chronological(runs).map((item) => item.id)).toEqual([1, 2]);
    expect(runs[0].id).toBe(2);
  });
});
