import { describe, expect, it } from "vitest";
import { attentionFor } from "./attention";
import type { Overview } from "./types";

function overview(overrides: {
  pending?: number;
  deadLetter?: number;
  failing?: number;
  failedCycles?: number;
  activeRun?: boolean;
}): Overview {
  return {
    health: { status: "healthy", reasons: [] },
    stats: {
      pendingNotifications: overrides.pending ?? 0,
      stalePendingNotifications: 0,
      deadLetterNotifications: overrides.deadLetter ?? 0,
      failedCycles24h: overrides.failedCycles ?? 0,
      staleRunningCycles: 0,
      successfulCycles24h: 1,
      recentArticles: 1,
      recentPrimarySources: 1,
    },
    day: "2026-10-17",
    editionsToday: 1,
    dailyEditionsTarget: 3,
    activeRun: overrides.activeRun
      ? { mode: "DAILY", pid: 1, startedAt: "2026-10-17 12:00:00" }
      : null,
    runsEnabled: true,
    latestEditions: [],
    lastCycles: [],
    sources: {
      total: 10,
      failing: overrides.failing ?? 0,
      primary: 1,
    },
    intelligence: null,
  };
}

describe("attentionFor", () => {
  it("shows nothing while the agent has nothing to report", () => {
    expect(attentionFor(overview({}))).toEqual({});
    expect(attentionFor(undefined)).toEqual({});
  });

  it("counts pending and dead-letter notifications together, and escalates on dead-letter", () => {
    expect(attentionFor(overview({ pending: 2 })).editions).toMatchObject({
      count: 2,
      tone: "warn",
    });
    expect(
      attentionFor(overview({ pending: 2, deadLetter: 1 })).editions,
    ).toMatchObject({ count: 3, tone: "danger" });
  });

  it("flags failing sources and failed cycles", () => {
    const map = attentionFor(overview({ failing: 4, failedCycles: 2 }));
    expect(map.sources).toMatchObject({ count: 4, tone: "warn" });
    expect(map.cycles).toMatchObject({ count: 2, tone: "warn" });
  });

  it("prefers a running cycle over the failed count, so the two never fight for the same badge", () => {
    const map = attentionFor(overview({ activeRun: true, failedCycles: 3 }));
    expect(map.cycles).toMatchObject({ count: 1, tone: "info" });
  });

  it("carries a label with the number, because a bare digit is not a tooltip", () => {
    const map = attentionFor(overview({ pending: 2, failing: 4 }));
    expect(map.editions?.title).toContain("2");
    expect(map.sources?.title).toContain("4");
  });
});
