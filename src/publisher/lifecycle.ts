import type { GeneratedArticle } from "../agent/types.js";
import { config } from "../config.js";
import { markRetracted } from "../knowledge/editions.js";
import { type PublishedArticle, db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";
import { buildPublicationBatch, commitFiles } from "./github.js";
import { buildMarkdown } from "./site-renderer.js";

/** `https://owner.github.io/repo/articles/x` -> `articles/x.md` */
export function pagePathFromUrl(url: string): string {
  const { pathname } = new URL(url);
  const [, , ...rest] = pathname.split("/");
  return `${rest.join("/").replace(/\/$/, "")}.md`;
}

export function retractionNotice(
  edition: Pick<PublishedArticle, "title" | "date">,
  reason: string,
  day: string,
): GeneratedArticle {
  return {
    title: edition.title,
    slug: "",
    summary: `Edição retirada em ${day}.`,
    tags: [],
    date: edition.date,
    sources: [],
    evidence: [],
    editorialMetrics: {
      considered: 0,
      selected: 0,
      rejected: 0,
      buckets: {},
      primarySources: 0,
    },
    content: `# ${edition.title}\n\n> **Edição retirada em ${day}.** ${reason}\n\nO conteúdo original foi removido do arquivo. Edições novas seguem no [índice](../).`,
  };
}

/**
 * Replaces the page with a notice and rebuilds the home and the feed without
 * it. The commit lands before the database changes, like a publication.
 */
export async function retractEdition(
  slug: string,
  reason: string,
  day: string,
  deps: {
    target?: { owner: string; repo: string; branch: string };
    client?: Parameters<typeof commitFiles>[5];
  } = {},
): Promise<string> {
  const edition = db.getPublishedBySlug(slug);
  if (!edition) throw new Error(`Unknown edition: ${slug}`);
  if (edition.status === "retracted") {
    throw new Error(`Edition already retracted: ${slug}`);
  }
  const target = deps.target ?? config.github;
  const notice = buildMarkdown(retractionNotice(edition, reason, day), {
    hidden: true,
  });
  const remaining = db
    .getPublished()
    .map((item) =>
      item.url === edition.url
        ? { ...item, status: "retracted" as const }
        : item,
    );
  const { files } = buildPublicationBatch([], remaining, target);
  await commitFiles(
    target.owner,
    target.repo,
    target.branch,
    [...files, { path: pagePathFromUrl(edition.url), content: notice }],
    `retract: ${edition.title}`,
    deps.client,
  );
  markRetracted(edition.url, reason, notice);
  log.info(`Retracted edition: ${edition.url}`);
  return edition.url;
}
