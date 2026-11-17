import type { Article } from "../../knowledge/store.js";
import { isCommunitySignal } from "../curation.js";
import type { ScoredItem } from "./scoring.js";

/**
 * No topic quota: every item that clears the floor is published. The score
 * only decides how deep it goes, and a reading budget demotes instead of cutting.
 */
export const LEARN_MIN_SCORE = 7;
export const TRY_MIN_SCORE = 5;
export const KNOW_MIN_SCORE = 3;
export const READING_BUDGET_MINUTES = 12;
const MINUTES = { learn: 6, try: 0.75, know: 0.2 } as const;
const MAX_THERMOMETER_TOPICS = 5;
const MIN_TOPIC_POSTS = 2;

export interface ThermometerTopic {
  topic: string;
  count: number;
  example: Article;
}

export interface Tiers {
  learn: ScoredItem | null;
  try: ScoredItem[];
  know: ScoredItem[];
  thermometer: ThermometerTopic[];
}

const TOPICS: Array<[string, RegExp]> = [
  [
    "Limites de uso e custo",
    /\b(limits?|quota|usage|rate.?limit|pricing|price|cost|billing|plan|tokens?)\b/i,
  ],
  [
    "Qualidade e regressões",
    /\b(regress\w*|worse|nerf\w*|dumb\w*|degrad\w*|lazy|quality)\b/i,
  ],
  ["Bugs e incidentes", /\b(outage|down|bug|broken|crash\w*|errors?)\b/i],
  [
    "Modelos locais e hardware",
    /\b(local|gguf|quant\w*|vram|gpu|llama\.cpp|ollama)\b/i,
  ],
  [
    "Segurança e privacidade",
    /\b(security|leak\w*|secrets?|privacy|inject\w*|malware)\b/i,
  ],
];

export function readingMinutes(tiers: Omit<Tiers, "thermometer">): number {
  return (
    (tiers.learn ? MINUTES.learn : 0) +
    tiers.try.length * MINUTES.try +
    tiers.know.length * MINUTES.know
  );
}

/** Debates enter only aggregated: a single complaint is never a topic. */
export function thermometerTopics(articles: Article[]): ThermometerTopic[] {
  const buckets = new Map<string, Article[]>();
  for (const article of articles.filter(isCommunitySignal)) {
    const topic = TOPICS.find(([, pattern]) => pattern.test(article.title));
    if (!topic) continue;
    buckets.set(topic[0], [...(buckets.get(topic[0]) ?? []), article]);
  }
  return [...buckets.entries()]
    .filter(([, posts]) => posts.length >= MIN_TOPIC_POSTS)
    .map(([topic, posts]) => ({
      topic,
      count: posts.length,
      example: posts.reduce((best, post) =>
        post.engagement_score > best.engagement_score ? post : best,
      ),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, MAX_THERMOMETER_TOPICS);
}

function canTry(item: ScoredItem): boolean {
  return (
    item.score >= TRY_MIN_SCORE &&
    (item.executable || item.artifacts.length > 0)
  );
}

/** Only first-party material may become the lesson: its code is what gets anchored. */
function canLearn(item: ScoredItem): boolean {
  return (
    item.layer === "teach" && item.executable && item.score >= LEARN_MIN_SCORE
  );
}

export function assignTiers(
  items: ScoredItem[],
  allArticles: Article[],
  budget = READING_BUDGET_MINUTES,
): Tiers {
  const sorted = [...items].sort((left, right) => right.score - left.score);
  const learn = sorted.find(canLearn) ?? null;
  const rest = sorted.filter((item) => item !== learn);
  const tryItems = rest.filter(canTry);
  const know = rest.filter(
    (item) => !tryItems.includes(item) && item.score >= KNOW_MIN_SCORE,
  );
  // Lowest-scored cards drop to a one-liner until the edition fits the budget.
  while (
    tryItems.length > 0 &&
    readingMinutes({ learn, try: tryItems, know }) > budget
  ) {
    know.unshift(tryItems.pop() as ScoredItem);
  }
  return {
    learn,
    try: tryItems,
    know: know.sort((left, right) => right.score - left.score),
    thermometer: thermometerTopics(allArticles),
  };
}
