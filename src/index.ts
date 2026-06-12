import cron from "node-cron";
import {
  assertValidArticle,
  editorialQualityScore,
} from "./agent/article-validation.js";
import { isPrimarySource } from "./agent/curation.js";
import { runImprovementCycle } from "./agent/improver.js";
import { rollbackPrompt } from "./agent/prompt-policy.js";
import { generateArticle, generatePeriodReport } from "./agent/writer.js";
import { config, loadConfig } from "./config.js";
import { crawlAll } from "./crawler/index.js";
import { db, getDb } from "./knowledge/store.js";
import {
  type PendingNotification,
  processNotification,
  processNotificationOutbox,
} from "./notifier/outbox.js";
import { notifyNewArticle, notifyWeeklyReport } from "./notifier/telegram.js";
import { publishArticle, publishWeeklyReport } from "./publisher/github.js";
import { setAiMetricRecorder } from "./utils/ai.js";
import { CycleCoordinator } from "./utils/cycle.js";
import { log } from "./utils/logger.js";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function closeDbAndExit(code = 0) {
  getDb().close();
  process.exit(code);
}

const cycles = new CycleCoordinator({
  start: (type) => db.startCycle(type),
  finish: (id, status, metrics, error) =>
    db.finishCycle(id, status, metrics, error),
});

setAiMetricRecorder((name, value, labels) =>
  db.recordMetric(name, value, labels),
);

async function sendPendingNotification(item: PendingNotification) {
  return item.kind === "report"
    ? notifyWeeklyReport(item.title, item.url, item.summary)
    : notifyNewArticle(item.title, item.url, item.summary);
}

async function flushNotificationOutbox() {
  const result = await processNotificationOutbox(db, sendPendingNotification);
  if (result.delivered + result.retried + result.deadLetter > 0) {
    log.info(
      `Notification outbox: delivered=${result.delivered}, retried=${result.retried}, dead_letter=${result.deadLetter}`,
    );
  }
  return result;
}

async function learnCycle() {
  log.info("=== Learn cycle start ===");
  const crawl = await crawlAll();
  await runImprovementCycle();
  db.recordMetric("crawl.saved", crawl.totalSaved);
  db.recordMetric("crawl.failed_sources", crawl.failedSources.length);
  const recentPrimarySources = db
    .getArticlesSince(2, 500)
    .filter(isPrimarySource).length;
  db.recordMetric("crawl.primary_sources_48h", recentPrimarySources);
  if (recentPrimarySources === 0) {
    log.error("No primary source collected in the last 48 hours");
  }
  log.info("=== Learn cycle done ===");
  return {
    crawled: crawl.totalSaved,
    failedSources: crawl.failedSources,
  };
}

async function articleCycle(type: "daily" | "weekly" = "daily") {
  log.info(`=== Article cycle start (${type}) ===`);
  try {
    const article = await generateArticle(type);
    assertValidArticle(article);
    db.recordMetric("editorial.quality_score", editorialQualityScore(article), {
      type,
    });
    db.recordMetric("editorial.selected_sources", article.sources.length, {
      type,
    });
    const url = await publishArticle(article);
    const notificationStatus = await processNotification(
      db,
      (item) =>
        notifyNewArticle(item.title, item.url, item.summary, article.sources),
      {
        url,
        title: article.title,
        summary: article.summary,
        kind: "article",
        notification_attempts: 0,
      },
    );
    const notified = notificationStatus === "delivered";
    log.info(`=== Article published: ${url} ===`);
    return { url, notified, selectedSources: article.sources.length };
  } catch (err) {
    const message = errMsg(err);
    if (
      message.startsWith("Editorial validation failed") ||
      message.startsWith("Editorial quality score below threshold")
    ) {
      const rolledBack = rollbackPrompt(db);
      db.recordMetric("editorial.prompt_rollback", rolledBack ? 1 : 0, {
        type,
      });
      log.warn(`Editorial gate triggered prompt rollback: ${rolledBack}`);
    }
    log.error(`Article cycle failed: ${errMsg(err)}`);
    throw err;
  }
}

async function reportCycle(
  period: "weekly" | "biweekly" | "monthly" | "bimonthly" | "semester",
) {
  log.info(`=== ${period} report cycle start ===`);
  try {
    const article = await generatePeriodReport(period);
    assertValidArticle(article);
    db.recordMetric("editorial.quality_score", editorialQualityScore(article), {
      type: period,
    });
    const url = await publishWeeklyReport(article, period);
    const notificationStatus = await processNotification(
      db,
      sendPendingNotification,
      {
        url,
        title: article.title,
        summary: article.summary,
        kind: "report",
        notification_attempts: 0,
      },
    );
    const notified = notificationStatus === "delivered";
    db.setState(`last_${period}_report_at`, new Date().toISOString());
    log.info(`=== ${period} report published: ${url} ===`);
    return { url, notified, selectedSources: article.sources.length };
  } catch (err) {
    const message = errMsg(err);
    if (
      message.startsWith("Editorial validation failed") ||
      message.startsWith("Editorial quality score below threshold")
    ) {
      const rolledBack = rollbackPrompt(db);
      db.recordMetric("editorial.prompt_rollback", rolledBack ? 1 : 0, {
        type: period,
      });
      log.warn(`Editorial gate triggered prompt rollback: ${rolledBack}`);
    }
    log.error(`${period} report cycle failed: ${errMsg(err)}`);
    throw err;
  }
}

async function main() {
  loadConfig(process.env);
  const runMode = config.runMode;

  if (runMode === "CRAWL") {
    log.info("Running in CRAWL mode");
    await cycles.run("crawl", learnCycle);
    closeDbAndExit(0);
  }

  if (runMode === "DAILY") {
    log.info("Running in DAILY mode");
    await cycles.run("daily", () => articleCycle("daily"));
    closeDbAndExit(0);
  }

  if (runMode === "WEEKLY") {
    log.info("Running in WEEKLY mode");
    await cycles.run("weekly", () => reportCycle("weekly"));
    closeDbAndExit(0);
  }

  if (runMode === "BIWEEKLY") {
    log.info("Running in BIWEEKLY mode");
    await cycles.run("biweekly", () => reportCycle("biweekly"));
    closeDbAndExit(0);
  }

  if (runMode === "MONTHLY") {
    log.info("Running in MONTHLY mode");
    await cycles.run("monthly", () => reportCycle("monthly"));
    closeDbAndExit(0);
  }

  if (runMode === "BIMONTHLY") {
    log.info("Running in BIMONTHLY mode");
    await cycles.run("bimonthly", () => reportCycle("bimonthly"));
    closeDbAndExit(0);
  }

  if (runMode === "SEMESTER") {
    log.info("Running in SEMESTER mode");
    await cycles.run("semester", () => reportCycle("semester"));
    closeDbAndExit(0);
  }

  // Default DAEMON mode
  log.info(
    `Evo Agent starting (learn every ${config.crawlIntervalMinutes}min)`,
  );

  // Run immediately on startup
  await cycles.run("crawl", learnCycle);
  await flushNotificationOutbox();

  // Check if weekly report is due (or if it's Sunday and no report was generated today)
  const lastWeeklyReport = db.getState("last_weekly_report_at");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (!lastWeeklyReport || new Date(lastWeeklyReport) < sevenDaysAgo) {
    log.info("Weekly report is due, running weekly report cycle...");
    await cycles.run("weekly", () => reportCycle("weekly"));
  }

  // Schedule learn+improve every N minutes
  const learnInterval = `*/${config.crawlIntervalMinutes} * * * *`;
  cron.schedule(learnInterval, () => {
    cycles
      .run("crawl", learnCycle)
      .catch((e) => log.error(`Learn cycle error: ${errMsg(e)}`));
  });

  // Vacuum SQLite once a day to reclaim space
  cron.schedule("0 3 * * *", () => {
    try {
      getDb().exec("VACUUM");
      log.info("SQLite VACUUM complete");
    } catch (e) {
      log.warn(`SQLite VACUUM failed: ${errMsg(e)}`);
    }
  });

  cron.schedule("*/5 * * * *", () => {
    flushNotificationOutbox().catch((e) =>
      log.error(`Notification outbox failed: ${errMsg(e)}`),
    );
  });

  // Schedule daily article
  cron.schedule(config.articleCron, () => {
    cycles
      .run("daily", () => articleCycle("daily"))
      .catch((e) => log.error(`Article cycle error: ${errMsg(e)}`));
  });

  // Schedule weekly report (Every Sunday at 6pm / 18:00)
  const weeklyCron = "0 18 * * 0";
  cron.schedule(weeklyCron, () => {
    cycles
      .run("weekly", () => reportCycle("weekly"))
      .catch((e) => log.error(`Weekly report cycle error: ${errMsg(e)}`));
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
