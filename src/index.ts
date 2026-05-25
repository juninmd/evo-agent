import cron from "node-cron";
import { runImprovementCycle } from "./agent/improver.js";
import { generateArticle } from "./agent/writer.js";
import { config } from "./config.js";
import { crawlAll } from "./crawler/index.js";
import { notifyNewArticle } from "./notifier/telegram.js";
import { publishArticle } from "./publisher/github.js";
import { log } from "./utils/logger.js";

async function learnCycle() {
  log.info("=== Learn cycle start ===");
  await crawlAll();
  await runImprovementCycle();
  log.info("=== Learn cycle done ===");
}

async function articleCycle(type: 'daily' | 'weekly' = 'daily') {
  log.info(`=== Article cycle start (${type}) ===`);
  try {
    const article = await generateArticle(type);
    const url = await publishArticle(article);
    await notifyNewArticle(article.title, url, article.summary, article.sources);
    log.info(`=== Article published: ${url} ===`);
  } catch (err) {
    log.error(`Article cycle failed: ${(err as Error).message}`);
  }
}

async function main() {
  const runMode = process.env.RUN_MODE || 'DAEMON';

  if (runMode === 'CRAWL') {
    log.info("Running in CRAWL mode");
    await learnCycle();
    process.exit(0);
  }

  if (runMode === 'DAILY') {
    log.info("Running in DAILY mode");
    await articleCycle('daily');
    process.exit(0);
  }

  if (runMode === 'WEEKLY') {
    log.info("Running in WEEKLY mode");
    await articleCycle('weekly');
    process.exit(0);
  }

  // Default DAEMON mode
  log.info(
    `Evo Agent starting (learn every ${config.crawlIntervalMinutes}min)`,
  );

  // Run immediately on startup
  await learnCycle();

  // Schedule learn+improve every N minutes
  const learnInterval = `*/${config.crawlIntervalMinutes} * * * *`;
  cron.schedule(learnInterval, () => {
    learnCycle().catch((e) => log.error(`Learn cycle error: ${e.message}`));
  });

  // Schedule daily article
  cron.schedule(config.articleCron, () => {
    articleCycle('daily').catch((e) => log.error(`Article cycle error: ${e.message}`));
  });

  log.info(`Scheduled: learn=${learnInterval}, article=${config.articleCron}`);
}

main().catch((e) => {
  log.error(`Fatal: ${e.message}`);
  process.exit(1);
});
