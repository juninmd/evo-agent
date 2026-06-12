import { describe, expect, it, vi } from "vitest";
import { CycleCoordinator } from "../utils/cycle.js";

describe("CycleCoordinator", () => {
  it("records successful runs and returns metrics", async () => {
    const events: Array<{ status: string; metrics?: string }> = [];
    const coordinator = new CycleCoordinator({
      start: () => 7,
      finish: (_id, status, metrics) =>
        events.push({ status, metrics: JSON.stringify(metrics) }),
    });

    const result = await coordinator.run("crawl", async () => ({
      crawled: 12,
    }));

    expect(result).toMatchObject({
      status: "succeeded",
      metrics: { crawled: 12 },
    });
    expect(events).toEqual([
      { status: "succeeded", metrics: '{"crawled":12}' },
    ]);
  });

  it("skips overlapping runs", async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const coordinator = new CycleCoordinator({
      start: vi.fn(() => 1),
      finish: vi.fn(),
    });

    const first = coordinator.run("crawl", async () => {
      await pending;
      return {};
    });
    await Promise.resolve();

    await expect(coordinator.run("daily", async () => ({}))).resolves.toEqual({
      type: "daily",
      status: "skipped",
      metrics: {},
      error: "another cycle is already running",
    });

    release();
    await first;
  });

  it("records sanitized failures and rethrows", async () => {
    const finish = vi.fn();
    const coordinator = new CycleCoordinator({
      start: () => 9,
      finish,
    });

    await expect(
      coordinator.run("weekly", async () => {
        throw new Error("token=secret-value");
      }),
    ).rejects.toThrow("token=secret-value");

    expect(finish).toHaveBeenCalledWith(9, "failed", {}, "token=[redacted]");
  });
});
