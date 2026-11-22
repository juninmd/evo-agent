import { generateDevBrief } from "./agent/dev-brief/index.js";
import { CLAUDE_NOTES_SOURCE } from "./crawler/claude-notes.js";
import { fetchModelCatalog } from "./crawler/model-launches.js";
import { feedbackStore } from "./knowledge/feedback-store.js";
import { db } from "./knowledge/store.js";
import { runDevAlerts } from "./notifier/dev-alerts.js";
import {
  defaultFeedbackDeps,
  feedbackRows,
  itemKey,
  pollFeedback,
} from "./notifier/feedback.js";
import { runModelAlerts } from "./notifier/model-alerts.js";
import {
  notifyDevAlert,
  notifyDevBrief,
  notifyModelLaunch,
} from "./notifier/telegram.js";
import { publishWeeklyReport } from "./publisher/github.js";
import { localDayIso } from "./utils/date.js";
import { log } from "./utils/logger.js";

const errMsg = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/** DEV_BRIEF: publish the page, then one Telegram card with a vote row per item. */
export async function devBriefCycle() {
  log.info("=== Dev brief cycle start ===");
  const brief = await generateDevBrief();
  const url = await publishWeeklyReport(brief.article, "devbrief");
  const keys = brief.top.map((item) => {
    const key = itemKey(item.url);
    feedbackStore.register({
      key,
      url: item.url,
      source: item.source,
      title: item.title.slice(0, 200),
    });
    return key;
  });
  const delivery = await notifyDevBrief(brief.message, url, feedbackRows(keys));
  db.recordMetric("devbrief.items", brief.top.length);
  db.setState("last_devbrief_at", new Date().toISOString());
  log.info(`=== Dev brief published: ${url} ===`);
  return { url, notified: delivery.delivered, items: brief.top.length };
}

/**
 * Runs after every hourly CRAWL: instant alerts (model, Claude note, removal)
 * and the Telegram votes. Each step is isolated so one outage skips only itself.
 */
export async function hourlyWatch(): Promise<void> {
  const steps: Array<[string, () => Promise<unknown>]> = [
    [
      "model alerts",
      () =>
        runModelAlerts({
          store: db,
          fetchCatalog: fetchModelCatalog,
          send: notifyModelLaunch,
        }),
    ],
    [
      "dev alerts",
      () =>
        runDevAlerts({
          store: db,
          notes: () =>
            db.getArticlesSince(240, 1000, { source: CLAUDE_NOTES_SOURCE }),
          send: notifyDevAlert,
          today: localDayIso(),
        }),
    ],
    ["feedback", () => pollFeedback(defaultFeedbackDeps(db))],
  ];
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (err) {
      log.warn(`Hourly watch: ${name} failed: ${errMsg(err)}`);
    }
  }
}
