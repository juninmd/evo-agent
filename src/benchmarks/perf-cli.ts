import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * `npm run benchmark:perf [-- --json out.json] [-- --compare before.json]`
 *
 * Seeds a throwaway SQLite file with about a year of production-shaped rows
 * and times the hot paths. `--compare` prints before/after side by side from a
 * report saved by an earlier run (same machine, same seed).
 */
function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const directory = mkdtempSync(join(tmpdir(), "evo-perf-"));
// Set before the store is imported: `config` reads the environment at import.
process.env.DB_PATH = join(directory, "bench.db");
process.env.LOG_LEVEL = "error";

try {
  const { formatReport, runPerfBenchmark, runSchedulingBenchmark } =
    await import("./perf-benchmark.js");
  const { SMOKE_SCALE, YEAR_SCALE } = await import("./perf-seed.js");
  const { getDb } = await import("../knowledge/store.js");

  const report = runPerfBenchmark(
    process.argv.includes("--smoke") ? SMOKE_SCALE : YEAR_SCALE,
  );
  getDb().close();

  const jsonPath = argument("--json");
  if (jsonPath) writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const comparePath = argument("--compare");
  const baseline = comparePath
    ? JSON.parse(readFileSync(comparePath, "utf8"))
    : undefined;
  console.log(`node ${report.node}`);
  console.log(formatReport(report, baseline));

  const scheduling = await runSchedulingBenchmark();
  console.log(
    `\nextra crawlers, simulated (${scheduling.crawlers} stubs x ${scheduling.latencyMs} ms): ` +
      `sequential ${scheduling.sequentialMs} ms, ${scheduling.limit} at a time ${scheduling.boundedMs} ms`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
