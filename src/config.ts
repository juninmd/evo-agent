import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import cron from "node-cron";

export type RunMode =
  | "DAEMON"
  | "CRAWL"
  | "DAILY"
  | "RADAR"
  | "TECHLEAD"
  | "DEV_TIPS"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "SEMESTER"
  | "EBOOK"
  | "MODEL_ALERTS"
  | "API";

type Env = Record<string, string | undefined>;

const RUN_MODES = new Set<RunMode>([
  "DAEMON",
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
  "API",
]);

function loadEnvFile(env: NodeJS.ProcessEnv) {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    if (env[key] === undefined) env[key] = match[2].trim();
  }
}

function positiveNumber(env: Env, key: string, fallback: string): number {
  const value = Number(env[key] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${key} must be a positive number`);
  }
  return value;
}

function validUrl(env: Env, key: string, fallback: string): string {
  const value = env[key] ?? fallback;
  try {
    new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
  return value.replace(/\/$/, "");
}

function port(env: Env, key: string, fallback: string): number {
  const value = positiveNumber(env, key, fallback);
  if (!Number.isInteger(value) || value > 65535) {
    throw new Error(`${key} must be a valid TCP port`);
  }
  return value;
}

function required(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export function loadConfig(env: Env = process.env, validatePublishing = true) {
  const rawMode = (env.RUN_MODE ?? "DAEMON").toUpperCase();
  if (!RUN_MODES.has(rawMode as RunMode)) {
    throw new Error(`RUN_MODE is invalid: ${rawMode}`);
  }
  const runMode = rawMode as RunMode;
  // API mode only reads the database; the CronJobs stay the only publishers.
  const publishes = runMode !== "CRAWL" && runMode !== "API";
  const articleCron = env.ARTICLE_CRON ?? "0 8,13,18 * * *";
  if (!cron.validate(articleCron)) {
    throw new Error(`ARTICLE_CRON is invalid: ${articleCron}`);
  }
  const radarCron = env.RADAR_CRON ?? "0 21 * * *";
  if (!cron.validate(radarCron)) {
    throw new Error(`RADAR_CRON is invalid: ${radarCron}`);
  }
  const modelAlertCron = env.MODEL_ALERT_CRON ?? "*/30 * * * *";
  if (!cron.validate(modelAlertCron)) {
    throw new Error(`MODEL_ALERT_CRON is invalid: ${modelAlertCron}`);
  }

  // The schedules and localDayIso() both assume BRT wall time; a container
  // defaulting to UTC ran the 22h sweep at 01h local, into the next day.
  const timezone = env.TZ?.trim() || "America/Sao_Paulo";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error(`TZ is invalid: ${timezone}`);
  }

  const requirePublishing = publishes && validatePublishing;
  // Model alerts only talk to Telegram; they never publish to GitHub Pages.
  const requireGithub = requirePublishing && runMode !== "MODEL_ALERTS";
  const telegramBotToken = requirePublishing
    ? required(env, "TELEGRAM_BOT_TOKEN")
    : (env.TELEGRAM_BOT_TOKEN ?? "");
  const telegramChatId = requirePublishing
    ? required(env, "TELEGRAM_CHAT_ID")
    : (env.TELEGRAM_CHAT_ID ?? "");
  const githubToken = requireGithub
    ? required(env, "GITHUB_TOKEN")
    : (env.GITHUB_TOKEN ?? "");
  const githubOwner = requireGithub
    ? required(env, "GITHUB_OWNER")
    : (env.GITHUB_OWNER ?? "");
  const githubRepo = requireGithub
    ? required(env, "GITHUB_REPO")
    : (env.GITHUB_REPO ?? "");

  // Serving operational data is only meaningful with a credential; the API
  // refuses to start without one instead of exposing the console anonymously.
  const apiToken =
    runMode === "API" ? required(env, "API_TOKEN") : (env.API_TOKEN ?? "");

  return {
    runMode,
    telegram: {
      botToken: telegramBotToken,
      chatId: telegramChatId,
    },
    github: {
      token: githubToken,
      owner: githubOwner,
      repo: githubRepo,
      branch: env.GITHUB_BRANCH ?? "gh-pages",
    },
    api: {
      // Loopback by default: a cluster manifest has to opt in to 0.0.0.0.
      host: env.API_HOST?.trim() || "127.0.0.1",
      port: port(env, "API_PORT", "8787"),
      token: apiToken,
      // Off by default: the console is an observability surface first, and a
      // writable endpoint on a published deployment is an explicit decision.
      allowRuns: env.API_ALLOW_RUNS?.trim().toLowerCase() === "true",
      corsOrigins: (env.API_CORS_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
    litellm: {
      apiBase: validUrl(
        env,
        "LITELLM_API_BASE",
        "http://litellm.ai.svc.cluster.local:4000/v1",
      ),
      apiKey: env.LITELLM_API_KEY ?? env.OPENCODE_API_KEY ?? "no-key",
      // Provider choice and fallbacks live in the LiteLLM cloud/auto chain.
      model: env.LITELLM_MODEL ?? env.OPENCODE_MODEL ?? "cloud/auto",
      fallbackModels: (env.LITELLM_FALLBACK_MODELS ?? "cloud/auto")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
      timeoutMs: positiveNumber(env, "LITELLM_TIMEOUT_MS", "300000"),
      maxOutputTokens: positiveNumber(
        env,
        "LITELLM_MAX_OUTPUT_TOKENS",
        "12000",
      ),
    },
    crawlIntervalMinutes: positiveNumber(env, "CRAWL_INTERVAL_MINUTES", "40"),
    articleCron,
    radarCron,
    modelAlertCron,
    timezone,
    dailyEditions: positiveNumber(env, "DAILY_EDITIONS", "3"),
    dbPath: env.DB_PATH ?? join(process.cwd(), "data", "knowledge.db"),
    searxngUrl: validUrl(
      env,
      "SEARXNG_URL",
      "http://searxng.searxng.svc.cluster.local",
    ),
    // Optional: GLiNER zero-shot NER tagging (see agent/entities.ts). Empty
    // key disables it — enrichment is best-effort, never required.
    gliner: {
      apiKey: env.HF_API_KEY ?? "",
      model: env.GLINER_MODEL ?? "urchade/gliner_multi-v2.1",
    },
  } as const;
}

loadEnvFile(process.env);
export const config = loadConfig(process.env, false);
