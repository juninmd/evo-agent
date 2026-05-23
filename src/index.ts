import cron from "node-cron";
import { runImprovementCycle } from "./agent/improver.js";
import { generateDailyArticle } from "./agent/writer.js";
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

async function articleCycle() {
  log.info("=== Article cycle start ===");
  try {
    const article = await generateDailyArticle();
    const url = await publishArticle(article);
    await notifyNewArticle(article.title, url, article.summary);
    log.info(`=== Article published: ${url} ===`);
  } catch (err) {
    log.error(`Article cycle failed: ${(err as Error).message}`);
  }
}

async function main() {
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
    articleCycle().catch((e) => log.error(`Article cycle error: ${e.message}`));
  });

  log.info(`Scheduled: learn=${learnInterval}, article=${config.articleCron}`);
}

main().catch((e) => {
  log.error(`Fatal: ${e.message}`);
  process.exit(1);
});
