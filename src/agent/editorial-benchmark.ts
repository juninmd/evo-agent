import {
  editorialQualityScore,
  validateArticle,
} from "./article-validation.js";
import type { GeneratedArticle } from "./writer.js";

export interface EditorialBenchmarkCase {
  name: string;
  article: GeneratedArticle;
  minScore: number;
  shouldPass: boolean;
}

export interface EditorialBenchmarkResult {
  name: string;
  score: number;
  errors: string[];
  expectedPass: boolean;
  actualPass: boolean;
  passed: boolean;
}

export function evaluateBenchmarkCase(
  benchmark: EditorialBenchmarkCase,
): EditorialBenchmarkResult {
  const score = editorialQualityScore(benchmark.article);
  const errors = validateArticle(benchmark.article);
  const actualPass = errors.length === 0 && score >= benchmark.minScore;
  return {
    name: benchmark.name,
    score,
    errors,
    expectedPass: benchmark.shouldPass,
    actualPass,
    passed: actualPass === benchmark.shouldPass,
  };
}

export function runEditorialBenchmark(cases: EditorialBenchmarkCase[]): {
  passed: boolean;
  averageScore: number;
  cases: EditorialBenchmarkResult[];
} {
  const results = cases.map(evaluateBenchmarkCase);
  const averageScore =
    results.length === 0
      ? 0
      : Math.round(
          results.reduce((sum, result) => sum + result.score, 0) /
            results.length,
        );
  return {
    passed: results.length > 0 && results.every((result) => result.passed),
    averageScore,
    cases: results,
  };
}
