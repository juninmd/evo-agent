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
  opencode: {
    provider: process.env.OPENCODE_PROVIDER ?? "google",
    model: process.env.OPENCODE_MODEL ?? "google/gemini-2.0-flash",
  },
  crawlIntervalMinutes: Number(process.env.CRAWL_INTERVAL_MINUTES ?? "40"),
  articleCron: process.env.ARTICLE_CRON ?? "0 8 * * *",
  dbPath: process.env.DB_PATH ?? join(process.cwd(), "data", "knowledge.db"),
} as const;
