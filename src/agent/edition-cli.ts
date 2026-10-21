import { config } from "../config.js";
import {
  countEvidence,
  getRevisions,
  queryEditions,
  requeueNotification,
  setQualityScore,
} from "../knowledge/editions.js";
import { db, getDb } from "../knowledge/store.js";
import { retractEdition } from "../publisher/lifecycle.js";
import { localDayIso } from "../utils/date.js";
import { scoreEdition } from "./quality.js";

const USAGE = `Usage: npm run edition -- <command>
  list [query]              latest editions (title, summary, tags, evidence match)
  show <slug>               status, score and revisions
  requeue <slug>            put the Telegram notification back in the outbox
  retract <slug> <reason>   replace the page with a notice and rebuild home/feed
  rescore                   fill quality_score for editions published before it existed`;

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  switch (command) {
    case "list": {
      const { total, items } = queryEditions({
        q: args.join(" ") || undefined,
        limit: 20,
        offset: 0,
      });
      print({
        total,
        items: items.map((item) => ({
          slug: item.slug,
          date: item.date,
          status: item.status,
          score: item.quality_score,
          notification: item.notification_status,
          title: item.title,
        })),
      });
      return 0;
    }
    case "show": {
      const edition = args[0] ? db.getPublishedBySlug(args[0]) : null;
      if (!edition) {
        console.error("unknown edition");
        return 1;
      }
      print({ edition, revisions: getRevisions(edition.url) });
      return 0;
    }
    case "requeue": {
      const ok = args[0] ? requeueNotification(args[0]) : false;
      print({ requeued: ok });
      return ok ? 0 : 1;
    }
    case "retract": {
      const [slug, ...reason] = args;
      if (!slug || reason.length === 0) {
        console.error("retract needs a slug and a reason");
        return 1;
      }
      const url = await retractEdition(
        slug,
        reason.join(" "),
        localDayIso(new Date(), config.timezone),
      );
      print({ retracted: url });
      return 0;
    }
    case "rescore": {
      let updated = 0;
      for (const edition of db.getPublished()) {
        if (edition.quality_score !== null) continue;
        const quality = scoreEdition(
          edition.editorial_metrics,
          countEvidence(edition.url),
        );
        if (!quality) continue;
        setQualityScore(edition.url, quality.score);
        updated++;
      }
      print({ updated });
      return 0;
    }
    default:
      console.error(USAGE);
      return 1;
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} finally {
  getDb().close();
}
