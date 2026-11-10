import { describe, expect, it } from "vitest";
import {
  formatReport,
  runPerfBenchmark,
  runSchedulingBenchmark,
} from "../benchmarks/perf-benchmark.js";
import {
  SMOKE_SCALE,
  buildArticles,
  buildVectors,
  seededRandom,
} from "../benchmarks/perf-seed.js";

// The benchmark is evidence for docs/BENCHMARK.md; this keeps it runnable when
// a store method or a route it times is renamed.
describe("perf benchmark", () => {
  it("times every case against a seeded database", () => {
    const report = runPerfBenchmark(SMOKE_SCALE);

    expect(report.results.length).toBeGreaterThan(20);
    for (const result of report.results) {
      expect(result.medianMs).toBeGreaterThanOrEqual(0);
      expect(result.p95Ms).toBeGreaterThanOrEqual(result.medianMs);
    }
    expect(
      report.results.filter((result) => result.name.startsWith("curation."))
        .length,
    ).toBe(2);
    expect(formatReport(report)).toContain("| GET /overview |");
  });

  it("compares two reports and flags an output that changed", () => {
    const base = {
      node: "v22",
      scale: SMOKE_SCALE,
      results: [
        {
          name: "a",
          iterations: 1,
          medianMs: 10,
          p95Ms: 12,
          minMs: 9,
          checksum: "x",
        },
        {
          name: "b",
          iterations: 1,
          medianMs: 2,
          p95Ms: 3,
          minMs: 1,
          checksum: "y",
        },
      ],
    };
    const next = {
      ...base,
      results: [
        {
          name: "a",
          iterations: 1,
          medianMs: 1,
          p95Ms: 2,
          minMs: 1,
          checksum: "x",
        },
        {
          name: "b",
          iterations: 1,
          medianMs: 4,
          p95Ms: 5,
          minMs: 3,
          checksum: "z",
        },
      ],
    };
    const table = formatReport(next, base);

    expect(table).toContain("| a | 10 | 1 | 12 | 2 | 10x faster | yes |");
    expect(table).toContain("| b | 2 | 4 | 3 | 5 | 2.0x slower | NO |");
  });

  it("times the bounded schedule against the sequential one", async () => {
    const result = await runSchedulingBenchmark(6, 5, 3);
    expect(result.sequentialMs).toBeGreaterThan(result.boundedMs);
  });

  it("generates the same rows for the same seed", () => {
    expect(seededRandom(3)()).toBe(seededRandom(3)());
    const first = buildArticles(20);
    const second = buildArticles(20);
    expect(first.map((a) => a.title)).toEqual(second.map((a) => a.title));
    const vectors = buildVectors(first, 16);
    expect(vectors.size).toBe(20);
    expect(vectors.get(first[0].url)).toHaveLength(16);
  });
});
