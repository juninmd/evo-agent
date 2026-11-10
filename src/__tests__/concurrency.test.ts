import { describe, expect, it } from "vitest";
import { mapLimit } from "../utils/concurrency.js";

describe("mapLimit", () => {
  it("keeps the input order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapLimit([5, 1, 4, 2, 3, 6], 3, async (value) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, value));
      inFlight--;
      return value * 2;
    });

    expect(results).toEqual([10, 2, 8, 4, 6, 12]);
    expect(peak).toBe(3);
  });

  it("runs in sequence with a limit of one and tolerates an empty list", async () => {
    const order: number[] = [];
    await mapLimit([1, 2, 3], 1, async (value) => {
      order.push(value);
      await Promise.resolve();
      order.push(-value);
    });
    expect(order).toEqual([1, -1, 2, -2, 3, -3]);
    expect(await mapLimit([], 4, async () => 1)).toEqual([]);
  });
});
