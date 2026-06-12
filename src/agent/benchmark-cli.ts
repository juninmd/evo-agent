import { editorialBenchmarkCases } from "../fixtures/editorial-benchmark.js";
import { runEditorialBenchmark } from "./editorial-benchmark.js";

const report = runEditorialBenchmark(editorialBenchmarkCases);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
