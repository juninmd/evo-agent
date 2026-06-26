import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import cron from "node-cron";

export type RunMode =
  | "DAEMON"
  | "CRAWL"
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "SEMESTER"
  | "EBOOK";

type Env = Record<string, string | undefined>;

const RUN_MODES = new Set<RunMode>([
  "DAEMON",
  "CRAWL",
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "SEMESTER",
  "EBOOK",
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
  const publishes = runMode !== "CRAWL";
  const articleCron = env.ARTICLE_CRON ?? "0 8 * * *";
  if (!cron.validate(articleCron)) {
    throw new Error(`ARTICLE_CRON is invalid: ${articleCron}`);
  }

  const requirePublishing = publishes && validatePublishing;
  const telegramBotToken = requirePublishing
    ? required(env, "TELEGRAM_BOT_TOKEN")
    : (env.TELEGRAM_BOT_TOKEN ?? "");
  const telegramChatId = requirePublishing
    ? required(env, "TELEGRAM_CHAT_ID")
    : (env.TELEGRAM_CHAT_ID ?? "");
  const githubToken = requirePublishing
    ? required(env, "GITHUB_TOKEN")
    : (env.GITHUB_TOKEN ?? "");
  const githubOwner = requirePublishing
    ? required(env, "GITHUB_OWNER")
    : (env.GITHUB_OWNER ?? "");
  const githubRepo = requirePublishing
    ? required(env, "GITHUB_REPO")
    : (env.GITHUB_REPO ?? "");

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
    litellm: {
      apiBase: validUrl(
        env,
        "LITELLM_API_BASE",
        "http://litellm.ai.svc.cluster.local:4000/v1",
      ),
      apiKey: env.LITELLM_API_KEY ?? env.OPENCODE_API_KEY ?? "no-key",
      model: env.LITELLM_MODEL ?? env.OPENCODE_MODEL ?? "cloud/llama-70b",
      fallbackModels: (
        env.LITELLM_FALLBACK_MODELS ?? "cloud/maverick,cloud/llama-8b"
      )
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
    dbPath: env.DB_PATH ?? join(process.cwd(), "data", "knowledge.db"),
    searxngUrl: validUrl(
      env,
      "SEARXNG_URL",
      "http://searxng.searxng.svc.cluster.local",
    ),
  } as const;
}

loadEnvFile(process.env);
export const config = loadConfig(process.env, false);
