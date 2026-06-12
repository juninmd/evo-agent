import { describe, expect, it } from "vitest";
import { evaluateHealth } from "../observability/health.js";

describe("operational health", () => {
  it("reports healthy when cycles, sources, and notifications are current", () => {
    expect(
      evaluateHealth({
        pendingNotifications: 0,
        deadLetterNotifications: 0,
        failedCycles24h: 0,
        successfulCycles24h: 3,
        recentArticles: 20,
        recentPrimarySources: 4,
      }),
    ).toEqual({ status: "healthy", reasons: [] });
  });

  it("degrades when no primary source was collected", () => {
    const result = evaluateHealth({
      pendingNotifications: 1,
      deadLetterNotifications: 0,
      failedCycles24h: 0,
      successfulCycles24h: 2,
      recentArticles: 12,
      recentPrimarySources: 0,
    });

    expect(result.status).toBe("degraded");
    expect(result.reasons).toContain("no recent primary sources");
  });

  it("is critical on dead-letter or no successful cycle", () => {
    const result = evaluateHealth({
      pendingNotifications: 0,
      deadLetterNotifications: 1,
      failedCycles24h: 2,
      successfulCycles24h: 0,
      recentArticles: 0,
      recentPrimarySources: 0,
    });

    expect(result.status).toBe("critical");
    expect(result.reasons).toContain("notifications in dead-letter");
    expect(result.reasons).toContain("no successful cycle in 24h");
  });
});
