import { percentile } from "./chart";
import type { CycleRun } from "./types";

export type CycleSummary = {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  skipped: number;
  /** Sucessos sobre ciclos concluidos (sucesso + falha); `null` sem nenhum. */
  successRate: number | null;
  medianSeconds: number | null;
  p95Seconds: number | null;
};

/** Leitura de relance da lista que a aba Ciclos ja carregou. */
export function summarizeCycles(runs: readonly CycleRun[]): CycleSummary {
  const count = (status: CycleRun["status"]) =>
    runs.filter((run) => run.status === status).length;
  const succeeded = count("succeeded");
  const failed = count("failed");
  const durations = runs
    .map((run) => run.durationSeconds)
    .filter((seconds): seconds is number => seconds !== null)
    .sort((a, b) => a - b);
  const decided = succeeded + failed;
  return {
    total: runs.length,
    succeeded,
    failed,
    running: count("running"),
    skipped: count("skipped"),
    successRate: decided > 0 ? succeeded / decided : null,
    medianSeconds: durations.length > 0 ? percentile(durations, 0.5) : null,
    p95Seconds: durations.length > 0 ? percentile(durations, 0.95) : null,
  };
}

/** A API devolve o mais novo primeiro; o grafico le da esquerda para a direita. */
export function chronological(runs: readonly CycleRun[]): CycleRun[] {
  return [...runs].reverse();
}
