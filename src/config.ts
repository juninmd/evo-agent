import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }
}
loadEnv();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

export const config = {
  telegram: {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    chatId: required("TELEGRAM_CHAT_ID"),
  },
  github: {
    token: required("GITHUB_TOKEN"),
    owner: required("GITHUB_OWNER"),
    repo: required("GITHUB_REPO"),
    branch: process.env.GITHUB_BRANCH ?? "gh-pages",
  },
  litellm: {
    apiBase:
      process.env.LITELLM_API_BASE ??
      "http://litellm.ai.svc.cluster.local:4000/v1",
    apiKey:
      process.env.LITELLM_API_KEY ?? process.env.OPENCODE_API_KEY ?? "no-key",
    model:
      process.env.LITELLM_MODEL ??
      process.env.OPENCODE_MODEL ??
      "z-ai/glm-4-32b",
    timeoutMs: Number(process.env.LITELLM_TIMEOUT_MS ?? "900000"),
    maxOutputTokens: Number(process.env.LITELLM_MAX_OUTPUT_TOKENS ?? "12000"),
  },
  crawlIntervalMinutes: Number(process.env.CRAWL_INTERVAL_MINUTES ?? "40"),
  articleCron: process.env.ARTICLE_CRON ?? "0 8 * * *",
  dbPath: process.env.DB_PATH ?? join(process.cwd(), "data", "knowledge.db"),
  searxngUrl:
    process.env.SEARXNG_URL ?? "http://searxng.searxng.svc.cluster.local",
} as const;
