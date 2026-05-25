import cron from "node-cron";
import { runImprovementCycle } from "./agent/improver.js";
import { generateArticle, generateWeeklyReport } from "./agent/writer.js";
import { config } from "./config.js";
import { crawlAll } from "./crawler/index.js";
import { db } from "./knowledge/store.js";
import { notifyNewArticle, notifyWeeklyReport } from "./notifier/telegram.js";
import { publishArticle, publishWeeklyReport } from "./publisher/github.js";
import { log } from "./utils/logger.js";

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
  }
}

async function weeklyReportCycle() {
  log.info("=== Weekly report cycle start ===");
  try {
    const article = await generateWeeklyReport();
    const url = await publishWeeklyReport(article);
    await notifyWeeklyReport(article.title, url, article.summary);
    db.setState("last_weekly_report_at", new Date().toISOString());
    log.info(`=== Weekly report published: ${url} ===`);
  } catch (err) {
    log.error(`Weekly report cycle failed: ${(err as Error).message}`);
  }
}

async function main() {
  const runMode = process.env.RUN_MODE || "DAEMON";

  if (runMode === "CRAWL") {
    log.info("Running in CRAWL mode");
    await learnCycle();
    process.exit(0);
  }

  if (runMode === "DAILY") {
    log.info("Running in DAILY mode");
    await articleCycle("daily");
    process.exit(0);
  }

  if (runMode === "WEEKLY") {
    log.info("Running in WEEKLY mode");
    await articleCycle("weekly");
    process.exit(0);
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
    await weeklyReportCycle();
  }

  // Schedule learn+improve every N minutes
  const learnInterval = `*/${config.crawlIntervalMinutes} * * * *`;
  cron.schedule(learnInterval, () => {
    learnCycle().catch((e) => log.error(`Learn cycle error: ${e.message}`));
  });

  // Schedule daily article
  cron.schedule(config.articleCron, () => {
    articleCycle("daily").catch((e) =>
      log.error(`Article cycle error: ${e.message}`),
    );
  });

  // Schedule weekly report (Every Sunday at 6pm / 18:00)
  const weeklyCron = "0 18 * * 0";
  cron.schedule(weeklyCron, () => {
    weeklyReportCycle().catch((e) =>
      log.error(`Weekly report cycle error: ${e.message}`),
    );
  });

  log.info(
    `Scheduled: learn=${learnInterval}, article=${config.articleCron}, weekly=${weeklyCron}`,
  );
}

main().catch((e) => {
  log.error(`Fatal: ${e.message}`);
  process.exit(1);
});
