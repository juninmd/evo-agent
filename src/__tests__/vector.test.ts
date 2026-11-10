import { describe, expect, it } from "vitest";
import { cosine, cosineWithNorms, squaredNorm } from "../utils/vector.js";

describe("cosineWithNorms", () => {
  // Dedup compares against a threshold, so "close" is not enough: a different
  // last bit could flip a pair that sits on the boundary.
  it("returns exactly what cosine returns", () => {
    let seed = 1;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296 - 0.5;
    };
    for (let round = 0; round < 50; round++) {
      const a = Float32Array.from({ length: 96 }, next);
      const b = Float32Array.from({ length: 96 }, next);
      expect(cosineWithNorms(a, squaredNorm(a), b, squaredNorm(b))).toBe(
        cosine(a, b),
      );
    }
  });

  it("answers 0 for empty, mismatched or zero vectors, like cosine", () => {
    const zero = new Float32Array(3);
    const unit = Float32Array.from([1, 0, 0]);
    expect(cosineWithNorms(zero, 0, unit, 1)).toBe(0);
    expect(cosineWithNorms(unit, 1, Float32Array.from([1, 0]), 1)).toBe(0);
    expect(
      cosineWithNorms(new Float32Array(0), 0, new Float32Array(0), 0),
    ).toBe(0);
  });
});
