import type { Article } from "../knowledge/store.js";
import { displayUrl } from "./radar-format.js";

export interface RadarBucket {
  key: string;
  title: string;
  articles: Article[];
}

const BUCKET_ORDER: Array<{
  key: string;
  title: string;
  matches: (source: string) => boolean;
  // Many feeds share the bucket: interleave them so crawl order cannot decide.
  perSource?: number;
  // Lowercased source names shown before the rest at each round of the interleave.
  followed?: string[];
}> = [
  {
    key: "github",
    title: "GitHub Trending",
    matches: (s) => s.startsWith("github trending"),
  },
  {
    key: "models",
    perSource: 10,
    title: "Modelos: lançamentos e trending",
    matches: (s) => s === "hf trending models" || s.startsWith("openrouter"),
  },
  {
    key: "reddit",
    title: "Reddit",
    matches: (s) => s.includes("reddit"),
  },
  {
    key: "hackernews",
    title: "Hacker News",
    matches: (s) => s.includes("hacker news"),
  },
  {
    key: "releases",
    perSource: 3,
    followed: [
      "claude code releases",
      "opencode releases",
      "vscode updates",
      "codex cli releases",
      "copilot cli releases",
      "gemini cli releases",
      "cursor changelog",
      "github changelog",
    ],
    title: "Releases e changelogs de agentes",
    matches: (s) =>
      !s.startsWith("techlead") &&
      (s.endsWith(" releases") ||
        s.includes("changelog") ||
        s === "vscode updates"),
  },
  {
    key: "vendors",
    perSource: 3,
    title: "Fabricantes e ferramentas",
    // Google News titles only mention vendors; they are press, not primary.
    matches: (s) =>
      !s.startsWith("google news") &&
      [
        "anthropic",
        "cloudflare",
        "foundry",
        "openai",
        "github blog",
        "google",
        "hugging face",
        "vscode",
        "mistral",
        "together ai",
        "deepmind",
      ].some((needle) => s.includes(needle)),
  },
  {
    key: "papers",
    title: "Pesquisa",
    matches: (s) => s.includes("arxiv") || s.includes("daily papers"),
  },
  {
    key: "community",
    perSource: 3,
    title: "Comunidade e produtos",
    matches: () => true,
  },
];

const MAX_PER_BUCKET = 15;
// HTML scrapers pick up listing chrome ("Browse all posts →") as articles.
const NAVIGATION_TITLE = /^(browse|see|view|read) (all|more)\b|→$/i;

/**
 * Round-robin over sources, best item of each first, at most `perSource` each.
 * Monorepos (Vercel AI SDK ships ~100 packages) would otherwise fill a bucket.
 */
function interleaveBySource(
  sorted: Article[],
  perSource: number,
  followed: string[] = [],
): Article[] {
  const seen = new Map<string, number>();
  const priority = (article: Article) => {
    const index = followed.indexOf(article.source.toLowerCase());
    return index < 0 ? followed.length : index;
  };
  return sorted
    .map((article) => {
      const rank = seen.get(article.source) ?? 0;
      seen.set(article.source, rank + 1);
      return { article, rank };
    })
    .filter(({ rank }) => rank < perSource)
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        priority(left.article) - priority(right.article),
    )
    .map(({ article }) => article);
}

export function bucketRadarArticles(articles: Article[]): RadarBucket[] {
  const byKey = new Map<string, Article[]>();
  for (const article of articles) {
    if (NAVIGATION_TITLE.test(article.title.trim())) continue;
    const source = article.source.toLowerCase();
    const bucket = BUCKET_ORDER.find((candidate) => candidate.matches(source));
    if (!bucket) continue;
    const list = byKey.get(bucket.key) ?? [];
    list.push(article);
    byKey.set(bucket.key, list);
  }

  return BUCKET_ORDER.map((bucket) => {
    const ranked = dedupeByUrl(byKey.get(bucket.key) ?? []).sort(
      (left, right) =>
        right.engagement_score - left.engagement_score ||
        right.crawled_at.localeCompare(left.crawled_at),
    );
    return {
      key: bucket.key,
      title: bucket.title,
      articles: (bucket.perSource
        ? interleaveBySource(ranked, bucket.perSource, bucket.followed)
        : ranked
      ).slice(0, MAX_PER_BUCKET),
    };
  }).filter((bucket) => bucket.articles.length > 0);
}

/**
 * A repo on both the daily and the weekly trending list is two signals with one
 * URL once the day key is stripped, and published_evidence is unique per
 * (article, source).
 */
export function dedupeByUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const url = displayUrl(article.url);
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}
