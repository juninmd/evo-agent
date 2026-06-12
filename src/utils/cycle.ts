export type CycleStatus = "succeeded" | "failed" | "skipped";

export interface CycleResult {
  type: string;
  status: CycleStatus;
  metrics: Record<string, unknown>;
  error?: string;
}

export interface CycleRunStore {
  start(type: string): number;
  finish(
    id: number,
    status: CycleStatus,
    metrics: Record<string, unknown>,
    error?: string,
  ): void;
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(
      /\b(token|key|password|secret|authorization)\s*[=:]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .slice(0, 2000);
}

export class CycleCoordinator {
  private active = false;

  constructor(private readonly store: CycleRunStore) {}

  async run(
    type: string,
    execute: () => Promise<Record<string, unknown>>,
  ): Promise<CycleResult> {
    if (this.active) {
      const runId = this.store.start(type);
      const error = "another cycle is already running";
      this.store.finish(runId, "skipped", {}, error);
      return {
        type,
        status: "skipped",
        metrics: {},
        error,
      };
    }

    this.active = true;
    const runId = this.store.start(type);
    try {
      const metrics = await execute();
      this.store.finish(runId, "succeeded", metrics);
      return { type, status: "succeeded", metrics };
    } catch (error) {
      const message = sanitizeError(error);
      this.store.finish(runId, "failed", {}, message);
      throw error;
    } finally {
      this.active = false;
    }
  }
}
