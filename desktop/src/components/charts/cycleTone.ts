import type { CycleRun } from "../../lib/types";

/** Cor de estado de um ciclo: reservada a estado, nunca reutilizada em serie. */
export const CYCLE_FILL: Record<CycleRun["status"], string> = {
  succeeded: "var(--color-ok)",
  failed: "var(--color-danger)",
  running: "var(--color-info)",
  skipped: "var(--color-warn)",
};

export const CYCLE_BG: Record<CycleRun["status"], string> = {
  succeeded: "bg-ok",
  failed: "bg-danger",
  running: "bg-info",
  skipped: "bg-warn",
};

export const CYCLE_STATUSES: CycleRun["status"][] = [
  "succeeded",
  "failed",
  "skipped",
  "running",
];
