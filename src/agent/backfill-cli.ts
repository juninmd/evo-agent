import { db, getDb } from "../knowledge/store.js";
import { publishArticleBatch } from "../publisher/github.js";
import { log } from "../utils/logger.js";
import {
  asRetroactiveArticle,
  historicalDates,
  parseBackfillCheckpoint,
} from "./backfill.js";
import { generateArticle } from "./writer.js";

const start = process.argv[2] ?? process.env.BACKFILL_START;
const end = process.argv[3] ?? process.env.BACKFILL_END;
if (!start || !end) {
  throw new Error(
    "Usage: node dist/agent/backfill-cli.js YYYY-MM-DD YYYY-MM-DD",
  );
}

try {
  const published = db.getPublished();
  const dates = historicalDates(start, end).filter(
    (date) =>
      !published.some(
        (item) =>
          item.date === date && item.slug.startsWith(`retroativo-${date}-`),
      ),
  );
  if (dates.length === 0) {
    log.info(`Backfill ${start}..${end}: nothing to publish`);
    process.exitCode = 0;
  } else {
    const articles = [];
    for (const date of dates) {
      const checkpointKey = `editorial.backfill.${date}`;
      const checkpoint = parseBackfillCheckpoint(
        db.getState(checkpointKey),
        date,
      );
      if (checkpoint) {
        log.info(`Reusing validated retroactive edition for ${date}`);
        articles.push(checkpoint);
        continue;
      }

      let article = null;
      let lastError: unknown;
      for (let round = 1; round <= 3 && !article; round++) {
        try {
          log.info(
            `Generating retroactive edition for ${date}, round ${round}`,
          );
          const generated = await generateArticle("daily", {
            targetDate: date,
          });
          article = asRetroactiveArticle(generated, date);
          db.setState(checkpointKey, JSON.stringify(generated));
        } catch (error) {
          lastError = error;
          log.warn(
            `Retroactive edition ${date}, round ${round} failed: ${(error as Error).message}`,
          );
        }
      }
      if (!article) {
        throw new Error(
          `Backfill failed for ${date}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        );
      }
      articles.push(article);
    }
    const urls = await publishArticleBatch(
      articles.map((article) => ({ article, reportPeriod: false })),
      {
        notificationStatus: "suppressed",
        message: `articles: backfill ${start} to ${end}`,
      },
    );
    db.recordMetric("editorial.backfill_articles", urls.length, { start, end });
    console.log(JSON.stringify({ start, end, published: urls }, null, 2));
  }
} finally {
  getDb().close();
}
