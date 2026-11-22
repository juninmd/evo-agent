import { AGENT_SKILLS_SOURCE } from "../../crawler/agent-skills.js";
import type { Article } from "../../knowledge/store.js";
import {
  isCommunitySignal,
  isPrimarySource,
  sourceBucket,
} from "../curation.js";
import { stackScore } from "../dev-brief/rank.js";
import { artifactLinks, hasExecutable, isMeasurable } from "./artifacts.js";

/**
 * teach: may supply code and steps. choose: signals what is worth a lesson.
 * thermometer: only counted, never a lesson on its own.
 */
export type Layer = "teach" | "choose" | "thermometer";

export interface ScoredItem {
  article: Article;
  layer: Layer;
  score: number;
  executable: boolean;
  artifacts: string[];
  reasons: string[];
}

export interface Discarded {
  article: Article;
  reason: DiscardReason;
}

export type DiscardReason =
  | "prerelease"
  | "business"
  | "no-artifact"
  | "duplicate"
  | "thin";

const NEWS_BUCKETS = new Set([
  "google-news",
  "websearch",
  "hackernews",
  "tabnews",
]);
const PRERELEASE = /-(rc|alpha|beta|nightly|canary|preview|dev)\b\.?\d*/i;
const BUSINESS =
  /\b(funding|raises?|raised|valuation|billion|bilh(ão|ões)|ipo|acquisition|acquires?|lawsuit|processo|ceo|resigns?|layoffs?|stock|ações)\b/i;
const HARNESSES =
  /\b(claude code|codex|gemini cli|copilot|opencode|cursor|cline|kilo code|aider|zed)\b/gi;
const CONCEPTS =
  /\b(skills?|skill\.md|mcp|hooks?|subagents?|sub-agents?|agents\.md|claude\.md|context engineering|harness)\b/i;
const MIN_TEXT = 60;

export function textOf(article: Article): string {
  return `${article.title}\n${article.body || article.summary || ""}`;
}

export function layerOf(article: Article): Layer {
  const bucket = sourceBucket(article.source);
  if (isCommunitySignal(article) || NEWS_BUCKETS.has(bucket)) {
    return "thermometer";
  }
  if (article.source === AGENT_SKILLS_SOURCE || isPrimarySource(article)) {
    return "teach";
  }
  return "choose";
}

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9.]+/)
      .filter((token) => token.length >= 4),
  );
}

/** Jaccard over the longer words: enough to spot a repeated topic, not a paraphrase. */
export function topicOverlap(left: string, right: string): number {
  return setOverlap(tokens(left), tokens(right));
}

function setOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / new Set([...a, ...b]).size;
}

/** Percentile of each engagement within its own bucket; votes are not comparable across sites. */
function tractionByUrl(articles: Article[]): Map<string, number> {
  const byBucket = new Map<string, number[]>();
  for (const article of articles) {
    const bucket = sourceBucket(article.source);
    const values = byBucket.get(bucket) ?? [];
    values.push(article.engagement_score);
    byBucket.set(bucket, values);
  }
  for (const values of byBucket.values()) values.sort((a, b) => a - b);
  const result = new Map<string, number>();
  for (const article of articles) {
    const values = byBucket.get(sourceBucket(article.source)) ?? [];
    if (values.length < 2 || article.engagement_score <= 0) {
      result.set(article.url, 0);
      continue;
    }
    result.set(
      article.url,
      countBelow(values, article.engagement_score) / (values.length - 1),
    );
  }
  return result;
}

/** Values strictly below `target` in an ascending array. */
function countBelow(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

function discardReason(
  article: Article,
  layer: Layer,
  executable: boolean,
  artifacts: string[],
): DiscardReason | null {
  if (PRERELEASE.test(article.title)) return "prerelease";
  if (textOf(article).length < MIN_TEXT) return "thin";
  if (BUSINESS.test(article.title) && !executable) return "business";
  // A post without a repo, docs or release behind it is an opinion, however upvoted.
  if (layer === "thermometer" && artifacts.length === 0) return "no-artifact";
  return null;
}

export interface ScoreOptions {
  /** Titles and summaries published in the novelty window. */
  recentTopics: string[];
  /** Reader's stack terms: +1 when the item mentions one. */
  stack?: string[];
  /** -1..1 per source from Telegram votes: ±1 past ±0.3. */
  weights?: Map<string, number>;
}

const VOTE_THRESHOLD = 0.3;

/**
 * Rubric (0–10): executable +3 (or +2 for a repo/docs link alone), traction
 * +2, transferable +2, new to the
 * reader +2, measurable +1; reader stack +1 and votes ±1, clamped. Discards are returned with their reason so the
 * edition can report what it left out.
 */
export function scoreArticles(
  articles: Article[],
  options: ScoreOptions,
): { items: ScoredItem[]; discarded: Discarded[] } {
  const traction = tractionByUrl(articles);
  const items: ScoredItem[] = [];
  const discarded: Discarded[] = [];
  // Tokenized once: the pairwise checks run over thousands of titles.
  const seenTitles: Array<Set<string>> = [];
  const recent = options.recentTopics.map(tokens);
  for (const article of articles) {
    const text = textOf(article);
    const layer = layerOf(article);
    const executable = hasExecutable(article.body || "");
    // A news or HN item linking straight to a repo carries its artifact in the URL.
    const artifacts = artifactLinks(`${article.url}\n${article.body || ""}`);
    const reason = discardReason(article, layer, executable, artifacts);
    if (reason) {
      discarded.push({ article, reason });
      continue;
    }
    const titleTokens = tokens(article.title);
    if (seenTitles.some((seen) => setOverlap(seen, titleTokens) >= 0.8)) {
      discarded.push({ article, reason: "duplicate" });
      continue;
    }
    seenTitles.push(titleTokens);

    const reasons: string[] = [];
    let score = 0;
    if (executable) {
      score += 3;
      reasons.push("executável");
    } else if (artifacts.length > 0) {
      // A repo or docs page is runnable one click away; inline code is better.
      score += 2;
      reasons.push("artefato");
    }
    const percentile = traction.get(article.url) ?? 0;
    if (percentile >= 0.75) {
      score += 2;
      reasons.push("tração alta");
    } else if (percentile >= 0.5) {
      score += 1;
      reasons.push("tração");
    }
    const harnesses = new Set(
      [...text.matchAll(HARNESSES)].map((m) => m[0].toLowerCase()),
    );
    if (harnesses.size >= 2 || CONCEPTS.test(text)) {
      score += 2;
      reasons.push("transferível");
    }
    if (!recent.some((topic) => setOverlap(topic, titleTokens) >= 0.5)) {
      score += 2;
      reasons.push("novo");
    }
    if (isMeasurable(text)) {
      score += 1;
      reasons.push("mensurável");
    }
    if (options.stack && stackScore(text, options.stack) > 0) {
      score += 1;
      reasons.push("sua stack");
    }
    const vote = options.weights?.get(article.source) ?? 0;
    if (Math.abs(vote) >= VOTE_THRESHOLD) {
      score += Math.sign(vote);
      reasons.push(vote > 0 ? "você curte" : "você descarta");
    }
    score = Math.max(0, Math.min(10, score));
    items.push({ article, layer, score, executable, artifacts, reasons });
  }
  items.sort((left, right) => right.score - left.score);
  return { items, discarded };
}
