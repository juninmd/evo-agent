import axios from "axios";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";
import { summarizeSourceContent } from "./feed-items.js";

export const HF_PAPERS_SOURCE = "HF Daily Papers";
const HF_PAPERS_LIMIT = 10;
const HF_PAPERS_MIN_UPVOTES = 5;
const PAPER_ID = /^[\w.-]+$/;

export interface RankedPaper {
  title: string;
  url: string;
  summary: string;
  engagement: number;
}

interface DailyPaperEntry {
  title?: string;
  numComments?: number;
  paper?: { id?: string; upvotes?: number; summary?: string };
}

/**
 * The raw arXiv feeds ship ~1000 papers a day in arbitrary order; the
 * community-curated daily list with upvotes is the ranking signal they lack.
 */
export function rankDailyPapers(
  entries: DailyPaperEntry[],
  limit = HF_PAPERS_LIMIT,
): RankedPaper[] {
  return entries
    .filter(
      (entry) =>
        entry.title &&
        PAPER_ID.test(entry.paper?.id ?? "") &&
        (entry.paper?.upvotes ?? 0) >= HF_PAPERS_MIN_UPVOTES,
    )
    .map((entry) => ({
      title: entry.title as string,
      url: `https://huggingface.co/papers/${entry.paper?.id}`,
      summary: summarizeSourceContent(entry.paper?.summary ?? "", 500),
      engagement: (entry.paper?.upvotes ?? 0) + (entry.numComments ?? 0) * 2,
    }))
    .sort((left, right) => right.engagement - left.engagement)
    .slice(0, limit);
}

/** Yesterday's list: today's is still collecting votes and ranks by noise. */
export async function crawlHuggingFacePapers(
  now = new Date(),
): Promise<number> {
  const day = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const response = await axios.get<DailyPaperEntry[]>(
    `https://huggingface.co/api/daily_papers?date=${day}&limit=100`,
    { timeout: 15000 },
  );
  const entries = Array.isArray(response.data) ? response.data : [];
  let saved = 0;
  for (const paper of rankDailyPapers(entries)) {
    if (db.urlExists(paper.url)) continue;
    db.saveArticle({
      title: paper.title,
      source: HF_PAPERS_SOURCE,
      url: paper.url,
      summary: paper.summary,
      tags: JSON.stringify(["papers", "research", "huggingface"]),
      engagement_score: paper.engagement,
    });
    saved++;
  }
  log.info(`Crawled ${HF_PAPERS_SOURCE} for ${day}, ${saved} new papers`);
  return saved;
}
