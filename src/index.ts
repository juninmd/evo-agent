import cron from "node-cron";
import {
  assertValidArticle,
  editorialQualityScore,
} from "./agent/article-validation.js";
import { isPrimarySource } from "./agent/curation.js";
import { generateDevTips } from "./agent/dev-tips.js";
import { refineEbook } from "./agent/ebook.js";
import { runImprovementCycle } from "./agent/improver.js";
import { rollbackPrompt } from "./agent/prompt-policy.js";
import { generateRadar } from "./agent/radar.js";
import { generateTechleadDigest } from "./agent/techlead.js";
import {
  DAILY_WINDOW_DAYS,
  type GenerateArticleOptions,
  generateArticle,
  generatePeriodReport,
} from "./agent/writer.js";
import { startApiServer } from "./api/server.js";
import { type RunMode, config, loadConfig } from "./config.js";
import { crawlAll } from "./crawler/index.js";
import { fetchModelCatalog } from "./crawler/model-launches.js";
import { recentEvidenceUrls } from "./knowledge/editions.js";
import { db, getDb } from "./knowledge/store.js";
import { runModelAlerts } from "./notifier/model-alerts.js";
import {
  type PendingNotification,
  processNotification,
  processNotificationOutbox,
} from "./notifier/outbox.js";
import {
  notifyModelLaunch,
  notifyNewArticle,
  notifyWeeklyReport,
} from "./notifier/telegram.js";
import {
  publishArticle,
  publishEbook,
  publishWeeklyReport,
} from "./publisher/github.js";
import { runModeHelp } from "./run-modes.js";
import { setAiMetricRecorder } from "./utils/ai.js";
import { CycleCoordinator } from "./utils/cycle.js";
import { addDays, localDayIso } from "./utils/date.js";
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
  const suppressed = db.suppressStaleNotifications(24);
  if (suppressed > 0) {
    db.recordMetric("notification.suppressed_stale", suppressed);
    log.warn(`Notification outbox: suppressed ${suppressed} stale pending`);
  }
  const result = await processNotificationOutbox(db, sendPendingNotification);
  if (result.delivered + result.retried + result.deadLetter > 0) {
    log.info(
      `Notification outbox: delivered=${result.delivered}, retried=${result.retried}, dead_letter=${result.deadLetter}`,
    );
  }
  return result;
}

function modelAlertCycle() {
  return runModelAlerts({
    store: db,
    fetchCatalog: fetchModelCatalog,
    send: notifyModelLaunch,
  });
}

async function learnCycle() {
  log.info("=== Learn cycle start ===");
  const crawl = await crawlAll();
  await runImprovementCycle();
  db.recordMetric("crawl.saved", crawl.totalSaved);
  db.recordMetric("crawl.failed_sources", crawl.failedSources.length);
  // Counted against its own budget, not inside the LIMIT-500 pool: Reddit runs
  // last, so the latest rows are community signals and would starve this metric.
  const recentPrimarySources = db.getPrimaryArticlesSince(2, 500).length;
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

async function articleCycle(
  type: "daily" | "weekly" = "daily",
  options: GenerateArticleOptions = {},
) {
  log.info(`=== Article cycle start (${type}) ===`);
  try {
    const article = await generateArticle(type, options);
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

// The radar publishes the raw cross-source sweep: deterministic tables plus a
// model-written reading. It deliberately skips the editorial gate, which exists
// to police narrative articles and would reject a table-shaped page.
async function radarCycle() {
  log.info("=== Radar cycle start ===");
  const radar = await generateRadar();
  db.recordMetric("radar.selected_sources", radar.sources.length);
  const url = await publishWeeklyReport(radar, "radar");
  const notificationStatus = await processNotification(
    db,
    sendPendingNotification,
    {
      url,
      title: radar.title,
      summary: radar.summary,
      kind: "report",
      notification_attempts: 0,
    },
  );
  db.setState("last_radar_at", new Date().toISOString());
  log.info(`=== Radar published: ${url} ===`);
  return {
    url,
    notified: notificationStatus === "delivered",
    selectedSources: radar.sources.length,
  };
}

async function techleadCycle() {
  log.info("=== Techlead cycle start ===");
  const digest = await generateTechleadDigest();
  db.recordMetric("techlead.selected_sources", digest.sources.length);
  const url = await publishWeeklyReport(digest, "techlead");
  const notificationStatus = await processNotification(
    db,
    sendPendingNotification,
    {
      url,
      title: digest.title,
      summary: digest.summary,
      kind: "report",
      notification_attempts: 0,
    },
  );
  db.setState("last_techlead_at", new Date().toISOString());
  log.info(`=== Techlead published: ${url} ===`);
  return {
    url,
    notified: notificationStatus === "delivered",
    selectedSources: digest.sources.length,
  };
}

async function devTipsCycle() {
  log.info("=== Dev tips cycle start ===");
  const tips = await generateDevTips();
  db.recordMetric("devtips.selected_sources", tips.sources.length);
  const url = await publishWeeklyReport(tips, "devtips");
  const notificationStatus = await processNotification(
    db,
    sendPendingNotification,
    {
      url,
      title: tips.title,
      summary: tips.summary,
      kind: "report",
      notification_attempts: 0,
    },
  );
  db.setState("last_devtips_at", new Date().toISOString());
  log.info(`=== Dev tips published: ${url} ===`);
  return {
    url,
    notified: notificationStatus === "delivered",
    selectedSources: tips.sources.length,
  };
}

async function ebookCycle() {
  log.info("=== Ebook cycle start ===");
  const ebook = await refineEbook();
  const url = await publishEbook(ebook);
  db.setState("last_ebook_at", new Date().toISOString());
  log.info(`=== Ebook published: ${url} ===`);
  return { url, lengthChars: ebook.markdown.length };
}

// Editions are stamped with the local day (see localDayIso). Counting them by
// the UTC day made the 22h sweep see zero editions after 21:00 BRT and publish
// the whole daily budget a second time.
function editionsPublishedToday(): number {
  return db.countPublishedOn("article", localDayIso());
}

// Sources already spent by the last editions. The draft window is two days, so
// excluding only today's would let yesterday's stories be covered again at 8h.
function sourcesUsedRecently(): string[] {
  return recentEvidenceUrls(addDays(localDayIso(), -(DAILY_WINDOW_DAYS - 1)));
}

// Idempotent daily editions: the day has a fixed budget (config.dailyEditions)
// and each run only fills what is missing, so restarts never duplicate a post.
// `fill` is used by the end-of-day sweep to recover cron slots missed while the
// pod was down; the scheduled slots themselves publish one edition each.
async function ensureDailyEditions(reason: string, fill = false) {
  const target = config.dailyEditions;
  while (editionsPublishedToday() < target) {
    const edition = editionsPublishedToday() + 1;
    log.info(`Generating daily edition ${edition}/${target} (${reason})`);
    try {
      const result = await cycles.run("daily", () =>
        articleCycle("daily", { excludeUrls: sourcesUsedRecently() }),
      );
      // A skipped run publishes nothing, so retrying inside this loop would spin
      // against whichever cycle is holding the coordinator.
      if (result.status !== "succeeded") {
        log.warn(`Daily edition ${edition}/${target} skipped: ${result.error}`);
        return;
      }
    } catch (e) {
      log.error(
        `Daily edition ${edition}/${target} (${reason}) failed: ${errMsg(e)}`,
      );
      return;
    }
    if (!fill) return;
  }
  log.info(`Daily editions complete for today (${reason})`);
}

// One-shot modes run a single job and exit; the value is the exit code.
// DAILY goes through ensureDailyEditions (not a bare articleCycle) so the day's
// budget holds and a job retry (backoffLimit) never publishes an extra edition.
// DAILY_SWEEP closes the day, including a morning slot that failed, because the
// cluster has no DAEMON sweep.
const ONE_SHOT_MODES: Partial<Record<RunMode, () => Promise<number>>> = {
  CRAWL: async () => {
    try {
      await cycles.run("crawl", learnCycle);
    } finally {
      // Production runs one-shot CronJobs, so the hourly crawl is the only
      // recurring process left to retry failed Telegram deliveries, even
      // when the crawl itself failed.
      await flushNotificationOutbox().catch((e) =>
        log.error(`Notification outbox failed: ${errMsg(e)}`),
      );
    }
    return 0;
  },
  DAILY: async () => {
    await ensureDailyEditions("scheduled");
    return 0;
  },
  DAILY_SWEEP: async () => {
    await ensureDailyEditions("end-of-day sweep", true);
    return 0;
  },
  RADAR: () => runCycle("radar", radarCycle),
  TECHLEAD: () => runCycle("techlead", techleadCycle),
  DEV_TIPS: () => runCycle("devtips", devTipsCycle),
  WEEKLY: () => runCycle("weekly", () => reportCycle("weekly")),
  BIWEEKLY: () => runCycle("biweekly", () => reportCycle("biweekly")),
  MONTHLY: () => runCycle("monthly", () => reportCycle("monthly")),
  BIMONTHLY: () => runCycle("bimonthly", () => reportCycle("bimonthly")),
  SEMESTER: () => runCycle("semester", () => reportCycle("semester")),
  EBOOK: () => runCycle("ebook", ebookCycle),
  MODEL_ALERTS: async () => ((await modelAlertCycle()).failed > 0 ? 1 : 0),
};

async function runCycle(
  type: Parameters<typeof cycles.run>[0],
  fn: () => Promise<Record<string, unknown>>,
): Promise<number> {
  await cycles.run(type, fn);
  return 0;
}

async function main() {
  loadConfig(process.env);
  const staleCycles = db.failStaleRunningCycles();
  if (staleCycles > 0) {
    log.warn(`Marked stale running cycles as failed: ${staleCycles}`);
  }
  const runMode = config.runMode;

  const oneShot = ONE_SHOT_MODES[runMode];
  if (oneShot) {
    log.info(`Running in ${runMode} mode`);
    closeDbAndExit(await oneShot());
  }

  if (runMode === "API") {
    log.info("Running in API mode");
    // Keeps the event loop alive on its own; the server owns its shutdown.
    await startApiServer();
    return;
  }

  // Default DAEMON mode
  log.info(
    `Evo Agent starting (learn every ${config.crawlIntervalMinutes}min)`,
  );

  // Run immediately on startup
  await cycles.run("crawl", learnCycle);
  await flushNotificationOutbox();

  // Catch up today's daily article if the daemon (re)started after the cron
  // fired. Unlike the weekly path, the daily cron has no recovery on its own,
  // so a deploy past ARTICLE_CRON would silently skip today's edition.
  await ensureDailyEditions("startup catch-up");

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
  cron.schedule(
    learnInterval,
    () => {
      cycles
        .run("crawl", learnCycle)
        .catch((e) => log.error(`Learn cycle error: ${errMsg(e)}`));
    },
    { timezone: config.timezone },
  );

  // Vacuum SQLite once a day to reclaim space
  cron.schedule(
    "0 3 * * *",
    () => {
      try {
        getDb().exec("VACUUM");
        log.info("SQLite VACUUM complete");
      } catch (e) {
        log.warn(`SQLite VACUUM failed: ${errMsg(e)}`);
      }
    },
    { timezone: config.timezone },
  );

  cron.schedule(
    "*/5 * * * *",
    () => {
      flushNotificationOutbox().catch((e) =>
        log.error(`Notification outbox failed: ${errMsg(e)}`),
      );
    },
    { timezone: config.timezone },
  );

  // Schedule daily editions (one per cron slot) plus a late sweep that fills any
  // slot missed while the pod was down.
  cron.schedule(
    config.articleCron,
    () => {
      void ensureDailyEditions("scheduled");
    },
    { timezone: config.timezone },
  );

  const dailySweepCron = "0 22 * * *";
  cron.schedule(
    dailySweepCron,
    () => {
      void ensureDailyEditions("end-of-day sweep", true);
    },
    { timezone: config.timezone },
  );

  // Schedule weekly report (Every Sunday at 6pm / 18:00)
  const weeklyCron = "0 18 * * 0";
  cron.schedule(
    weeklyCron,
    () => {
      cycles
        .run("weekly", () => reportCycle("weekly"))
        .catch((e) => log.error(`Weekly report cycle error: ${errMsg(e)}`));
    },
    { timezone: config.timezone },
  );

  const ebookCron = "30 19 * * 0";
  cron.schedule(
    ebookCron,
    () => {
      cycles
        .run("ebook", ebookCycle)
        .catch((e) => log.error(`Ebook cycle error: ${errMsg(e)}`));
    },
    { timezone: config.timezone },
  );

  cron.schedule(
    config.radarCron,
    () => {
      cycles
        .run("radar", radarCycle)
        .catch((e) => log.error(`Radar cycle error: ${errMsg(e)}`));
    },
    { timezone: config.timezone },
  );

  // Outside the cycle coordinator: a long article cycle must not delay alerts.
  cron.schedule(
    config.modelAlertCron,
    () =>
      modelAlertCycle().catch((e) =>
        log.error(`Model alert cycle error: ${errMsg(e)}`),
      ),
    { timezone: config.timezone, noOverlap: true },
  );

  log.info(
    `Scheduled: learn=${learnInterval}, article=${config.articleCron} (${config.dailyEditions}/dia), sweep=${dailySweepCron}, radar=${config.radarCron}, weekly=${weeklyCron}, ebook=${ebookCron}, modelAlerts=${config.modelAlertCron}`,
  );

  // A cycle killed mid-run left its row 'running' until the 6h stale sweep, so
  // health reported critical for hours after every routine restart. Only this
  // process's own run is closed: a blanket sweep would finish a concurrent
  // instance's row out from under it.
  const shutdown = (signal: string) => {
    log.info(`${signal} received, closing...`);
    const runId = cycles.activeRunId;
    if (runId !== null) {
      log.warn(`Marking in-flight cycle ${runId} as failed`);
      db.finishCycle(runId, "failed", {}, `interrupted by ${signal}`);
    }
    closeDbAndExit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(runModeHelp());
  process.exit(0);
}

main().catch((e) => {
  log.error(`Fatal: ${errMsg(e)}`);
  getDb().close();
  process.exit(1);
});
