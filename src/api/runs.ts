import { spawn } from "node:child_process";
import { log } from "../utils/logger.js";

/**
 * Modes the console may trigger. `API` and `DAEMON` are excluded on purpose:
 * running them would spawn a second scheduler inside the API process's group.
 */
export const RUNNABLE_MODES = [
  "CRAWL",
  "DAILY",
  "RADAR",
  "TECHLEAD",
  "DEV_TIPS",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "SEMESTER",
  "EBOOK",
  "MODEL_ALERTS",
] as const;

export type RunnableMode = (typeof RUNNABLE_MODES)[number];

export function isRunnableMode(value: string): value is RunnableMode {
  return (RUNNABLE_MODES as readonly string[]).includes(value);
}

export interface RunHandle {
  mode: RunnableMode;
  pid: number | null;
  startedAt: string;
}

/** The slice of ChildProcess the spawner touches, so tests can inject one. */
export interface RunChild {
  pid?: number;
  stdout: {
    on: (event: string, listener: (chunk: Buffer) => void) => unknown;
  } | null;
  stderr: {
    on: (event: string, listener: (chunk: Buffer) => void) => unknown;
  } | null;
  on: (event: string, listener: (value: never) => void) => unknown;
}

export interface RunSpawnerOptions {
  execPath?: string;
  entry?: string;
  env?: NodeJS.ProcessEnv;
  spawnChild?: (mode: RunnableMode) => RunChild;
}

export interface RunSpawner {
  /** Null while no child is in flight. */
  active(): RunHandle | null;
  start(mode: RunnableMode): RunHandle;
}

export interface RunSpawnerHooks {
  onExit?: (mode: RunnableMode, code: number | null) => void;
}

export type RunPlan =
  | { ok: false; status: number; error: string }
  | { ok: true; mode: RunnableMode };

/**
 * Decide whether a run request may start, without starting it: the four
 * outcomes (disabled, busy, bad mode, accepted) stay unit-testable while the
 * route handler stays a thin caller.
 */
export function planRun(options: {
  allowRuns: boolean;
  active: RunHandle | null;
  mode: unknown;
}): RunPlan {
  if (!options.allowRuns) {
    return {
      ok: false,
      status: 501,
      error: "run triggering is disabled; set API_ALLOW_RUNS=true",
    };
  }
  if (options.active) {
    return {
      ok: false,
      status: 409,
      error: `a ${options.active.mode} run started at ${options.active.startedAt} is still in flight`,
    };
  }
  const mode =
    typeof options.mode === "string" ? options.mode.trim().toUpperCase() : "";
  if (!isRunnableMode(mode)) {
    return {
      ok: false,
      status: 400,
      error: `mode must be one of: ${RUNNABLE_MODES.join(", ")}`,
    };
  }
  return { ok: true, mode };
}

function pipeLines(
  stream: RunChild["stdout"],
  emit: (line: string) => void,
): void {
  if (!stream) return;
  let buffer = "";
  stream.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) emit(line);
    }
  });
}

/**
 * Runs a one-shot cycle as a child of this process, which keeps the API itself
 * read-only: a crashed cycle can never take the console down with it.
 */
export function createRunSpawner(
  options: RunSpawnerOptions = {},
  hooks: RunSpawnerHooks = {},
): RunSpawner {
  const execPath = options.execPath ?? process.execPath;
  // process.argv[1] is the running entry: dist/index.js in the image, src/index.ts
  // under tsx, so the child is started exactly the way this process was.
  const entry = options.entry ?? process.argv[1];
  let current: RunHandle | null = null;

  const spawnChild =
    options.spawnChild ??
    ((mode: RunnableMode) =>
      spawn(execPath, [entry], {
        env: { ...(options.env ?? process.env), RUN_MODE: mode },
        stdio: ["ignore", "pipe", "pipe"],
      }) as unknown as RunChild);

  return {
    active: () => current,

    start(mode) {
      const child = spawnChild(mode);
      const handle: RunHandle = {
        mode,
        pid: child.pid ?? null,
        startedAt: new Date().toISOString(),
      };
      current = handle;
      log.info(`Run ${mode} started as pid ${handle.pid ?? "unknown"}`);

      pipeLines(child.stdout, (line) => log.info(`[run ${mode}] ${line}`));
      pipeLines(child.stderr, (line) => log.error(`[run ${mode}] ${line}`));

      child.on("exit", ((code: number | null) => {
        current = null;
        if (code === 0) {
          log.info(`Run ${mode} finished`);
        } else {
          log.warn(`Run ${mode} exited with code ${code}`);
        }
        hooks.onExit?.(mode, code);
      }) as (value: never) => void);

      child.on("error", ((error: Error) => {
        current = null;
        log.error(`Run ${mode} failed to start: ${error.message}`);
        hooks.onExit?.(mode, null);
      }) as (value: never) => void);

      return handle;
    },
  };
}
