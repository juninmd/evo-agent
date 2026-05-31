import cron from "node-cron";
import { runImprovementCycle } from "./agent/improver.js";
import { generateArticle, generatePeriodReport } from "./agent/writer.js";
import { config } from "./config.js";
import { crawlAll } from "./crawler/index.js";
import { db, getDb } from "./knowledge/store.js";
import { notifyNewArticle, notifyWeeklyReport } from "./notifier/telegram.js";
import { publishArticle, publishWeeklyReport } from "./publisher/github.js";
import { log } from "./utils/logger.js";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function closeDbAndExit(code = 0) {
  getDb().close();
  process.exit(code);
}

async function learnCycle() {
  log.info("=== Learn cycle start ===");
  await crawlAll();
  await runImprovementCycle();
  log.info("=== Learn cycle done ===");
}

async function articleCycle(type: "daily" | "weekly" = "daily") {
  log.info(`=== Article cycle start (${type}) ===`);
  try {
    const article = await generateArticle(type);
    const url = await publishArticle(article);
    await notifyNewArticle(
      article.title,
      url,
      article.summary,
      article.sources,
    );
    log.info(`=== Article published: ${url} ===`);
  } catch (err) {
    log.error(`Article cycle failed: ${(err as Error).message}`);
    throw err;
  }
}

async function reportCycle(
  period: "weekly" | "biweekly" | "monthly" | "bimonthly" | "semester",
) {
  log.info(`=== ${period} report cycle start ===`);
  try {
    const article = await generatePeriodReport(period);
    const url = await publishWeeklyReport(article, period);
    await notifyWeeklyReport(article.title, url, article.summary);
    db.setState(`last_${period}_report_at`, new Date().toISOString());
    log.info(`=== ${period} report published: ${url} ===`);
  } catch (err) {
    log.error(`${period} report cycle failed: ${(err as Error).message}`);
    throw err;
  }
}

async function main() {
  const runMode = process.env.RUN_MODE || "DAEMON";

  if (runMode === "CRAWL") {
    log.info("Running in CRAWL mode");
    await learnCycle();
    closeDbAndExit(0);
  }

  if (runMode === "DAILY") {
    log.info("Running in DAILY mode");
    await articleCycle("daily");
    closeDbAndExit(0);
  }

  if (runMode === "WEEKLY") {
    log.info("Running in WEEKLY mode");
    await reportCycle("weekly");
    closeDbAndExit(0);
  }

  if (runMode === "BIWEEKLY") {
    log.info("Running in BIWEEKLY mode");
    await reportCycle("biweekly");
    closeDbAndExit(0);
  }

  if (runMode === "MONTHLY") {
    log.info("Running in MONTHLY mode");
    await reportCycle("monthly");
    closeDbAndExit(0);
  }

  if (runMode === "BIMONTHLY") {
    log.info("Running in BIMONTHLY mode");
    await reportCycle("bimonthly");
    closeDbAndExit(0);
  }

  if (runMode === "SEMESTER") {
    log.info("Running in SEMESTER mode");
    await reportCycle("semester");
    closeDbAndExit(0);
  }

  // Default DAEMON mode
  log.info(
    `Evo Agent starting (learn every ${config.crawlIntervalMinutes}min)`,
  );

  // Run immediately on startup
  await learnCycle();

  // Check if weekly report is due (or if it's Sunday and no report was generated today)
  const lastWeeklyReport = db.getState("last_weekly_report_at");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (!lastWeeklyReport || new Date(lastWeeklyReport) < sevenDaysAgo) {
    log.info("Weekly report is due, running weekly report cycle...");
    await reportCycle("weekly");
  }

  // Schedule learn+improve every N minutes
  const learnInterval = `*/${config.crawlIntervalMinutes} * * * *`;
  cron.schedule(learnInterval, () => {
    learnCycle().catch((e) => log.error(`Learn cycle error: ${errMsg(e)}`));
  });

  // Schedule daily article
  cron.schedule(config.articleCron, () => {
    articleCycle("daily").catch((e) =>
      log.error(`Article cycle error: ${errMsg(e)}`),
    );
  });

  // Schedule weekly report (Every Sunday at 6pm / 18:00)
  const weeklyCron = "0 18 * * 0";
  cron.schedule(weeklyCron, () => {
    reportCycle("weekly").catch((e) =>
      log.error(`Weekly report cycle error: ${errMsg(e)}`),
    );
  });

  log.info(
    `Scheduled: learn=${learnInterval}, article=${config.articleCron}, weekly=${weeklyCron}`,
  );

  process.on("SIGINT", () => {
    log.info("SIGINT received, closing...");
    closeDbAndExit(0);
  });
  process.on("SIGTERM", () => {
    log.info("SIGTERM received, closing...");
    closeDbAndExit(0);
  });
}

main().catch((e) => {
  log.error(`Fatal: ${errMsg(e)}`);
  getDb().close();
  process.exit(1);
});
