import { db } from "../knowledge/store.js";
import type { Article } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { log } from "../utils/logger.js";
import type { GeneratedArticle } from "./types.js";

/**
 * The radar is a cross-source sweep, not an essay: the tables are built
 * deterministically from the database and the model only writes the reading of
 * what changed. A model outage degrades the summary, never the data.
 */

export interface RadarBucket {
  key: string;
  title: string;
  articles: Article[];
}

const BUCKET_ORDER: Array<{
  key: string;
  title: string;
  matches: (source: string) => boolean;
}> = [
  {
    key: "github",
    title: "GitHub Trending",
    matches: (s) => s.startsWith("github trending"),
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
    key: "vendors",
    title: "Fabricantes e ferramentas",
    matches: (s) =>
      [
        "anthropic",
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
    matches: (s) => s.includes("arxiv"),
  },
  {
    key: "community",
    title: "Comunidade e produtos",
    matches: () => true,
  },
];

const MAX_PER_BUCKET = 12;
export const RADAR_WINDOW_HOURS = 24;

export function bucketRadarArticles(articles: Article[]): RadarBucket[] {
  const byKey = new Map<string, Article[]>();
  for (const article of articles) {
    const source = article.source.toLowerCase();
    const bucket = BUCKET_ORDER.find((candidate) => candidate.matches(source));
    if (!bucket) continue;
    const list = byKey.get(bucket.key) ?? [];
    list.push(article);
    byKey.set(bucket.key, list);
  }

  return BUCKET_ORDER.map((bucket) => ({
    key: bucket.key,
    title: bucket.title,
    articles: (byKey.get(bucket.key) ?? [])
      .sort(
        (left, right) =>
          right.engagement_score - left.engagement_score ||
          right.crawled_at.localeCompare(left.crawled_at),
      )
      .slice(0, MAX_PER_BUCKET),
  })).filter((bucket) => bucket.articles.length > 0);
}

/** Trending signals are stored as `<repo>#trending-daily-<day>`. */
export function displayUrl(url: string): string {
  return url.split("#")[0];
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

export function renderRadarTables(buckets: RadarBucket[]): string {
  return buckets
    .map((bucket) => {
      const rows = bucket.articles
        .map((article) => {
          const signal = article.engagement_score
            ? String(article.engagement_score)
            : "-";
          return `| [${cell(article.title)}](${displayUrl(article.url)}) | ${cell(article.source)} | ${signal} |`;
        })
        .join("\n");
      return [
        `## ${bucket.title}`,
        "",
        "| Item | Fonte | Sinal |",
        "|---|---|---|",
        rows,
        "",
      ].join("\n");
    })
    .join("\n");
}

export function radarDigestForModel(buckets: RadarBucket[]): string {
  return buckets
    .map((bucket) =>
      [
        `${bucket.title}:`,
        ...bucket.articles.map(
          (article) =>
            `- ${article.title} (sinal ${article.engagement_score}) :: ${article.summary.slice(0, 240)}`,
        ),
      ].join("\n"),
    )
    .join("\n\n");
}

export function fallbackReading(buckets: RadarBucket[]): string {
  const top = buckets
    .flatMap((bucket) => bucket.articles)
    .sort((left, right) => right.engagement_score - left.engagement_score)
    .slice(0, 6)
    .map((article, index) => `${index + 1}. ${article.title}`);
  return [
    "## TL;DR",
    "",
    "Sintese automatica indisponivel nesta rodada; itens de maior sinal:",
    "",
    ...top,
    "",
  ].join("\n");
}

const RADAR_SYSTEM_PROMPT = [
  "Voce escreve o resumo executivo de um radar diario de IA para um tech lead.",
  "Responda em pt-BR, denso, sem floreio, sem introducao e sem conclusao.",
  "Formato exato: uma secao '## TL;DR' com 6 a 8 itens numerados,",
  "seguida de uma secao '## O que observar' com 3 bullets.",
  "Cada item do TL;DR precisa de um fato concreto (numero, nome de produto ou versao).",
  "Nao invente dados: use apenas o que esta no material fornecido.",
].join(" ");

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

export function radarDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function radarTitle(day: string): string {
  const [year, month, dayOfMonth] = day.split("-");
  return `Radar IA — ${dayOfMonth}/${month}/${year}`;
}

export async function generateRadar(
  now = new Date(),
): Promise<GeneratedArticle> {
  const articles = db.getArticlesSince(1, 1500);
  const buckets = bucketRadarArticles(articles);
  if (buckets.length === 0) {
    throw new Error("Radar has no articles in the last 24 hours");
  }

  let reading: string;
  try {
    reading = await ask(
      `Material coletado nas ultimas ${RADAR_WINDOW_HOURS} horas:\n\n${radarDigestForModel(buckets)}`,
      RADAR_SYSTEM_PROMPT,
      { maxOutputTokens: 2000 },
    );
  } catch (err) {
    log.warn(
      `Radar reading fell back to raw ranking: ${err instanceof Error ? err.message : String(err)}`,
    );
    reading = fallbackReading(buckets);
  }

  const day = radarDate(now);
  const selected = dedupeByUrl(buckets.flatMap((bucket) => bucket.articles));
  const content = [
    reading.trim(),
    "",
    renderRadarTables(buckets),
    `_Coleta automatica de ${selected.length} itens em ${buckets.length} frentes nas ultimas ${RADAR_WINDOW_HOURS} horas._`,
  ].join("\n");

  return {
    title: radarTitle(day),
    slug: `radar-${day}`,
    content,
    summary: `Radar de ${selected.length} sinais de IA das ultimas ${RADAR_WINDOW_HOURS}h: ${buckets.map((bucket) => bucket.title).join(", ")}.`,
    tags: ["radar", "ia", "trending", ...buckets.map((bucket) => bucket.key)],
    date: day,
    sources: selected.map((article) => displayUrl(article.url)),
    evidence: selected.slice(0, 30).map((article) => ({
      sourceUrl: displayUrl(article.url),
      sourceTitle: article.title,
      excerpt: article.summary.slice(0, 400),
    })),
    editorialMetrics: {
      considered: articles.length,
      selected: selected.length,
      rejected: articles.length - selected.length,
      buckets: Object.fromEntries(
        buckets.map((bucket) => [bucket.key, bucket.articles.length]),
      ),
      primarySources:
        buckets.find((bucket) => bucket.key === "vendors")?.articles.length ??
        0,
    },
    reportPeriod: "radar",
  };
}
