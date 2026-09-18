import { db } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { log } from "../utils/logger.js";
import {
  type RadarBucket,
  bucketRadarArticles,
  dedupeByUrl,
} from "./radar-buckets.js";
import { cell, displayUrl, rowSummary } from "./radar-format.js";
import { renderLaunchHighlights } from "./radar-launches.js";
import { extractReading } from "./radar-reading.js";
import type { GeneratedArticle } from "./types.js";

export {
  bucketRadarArticles,
  dedupeByUrl,
  displayUrl,
  extractReading,
  type RadarBucket,
  renderLaunchHighlights,
};

/**
 * The radar is a cross-source sweep, not an essay: the tables are built
 * deterministically from the database and the model only writes the reading of
 * what changed. A model outage degrades the summary, never the data.
 */

const READING_ATTEMPTS = 2;
export const RADAR_WINDOW_HOURS = 24;

export function renderRadarTables(buckets: RadarBucket[]): string {
  return buckets
    .map((bucket) => {
      const rows = bucket.articles
        .map((article) => {
          const signal = article.engagement_score
            ? String(article.engagement_score)
            : "-";
          return `| [${cell(article.title)}](${displayUrl(article.url)}) | ${rowSummary(article.summary)} | ${cell(article.source)} | ${signal} |`;
        })
        .join("\n");
      return [
        `## ${bucket.title}`,
        "",
        "| Item | Resumo | Fonte | Sinal |",
        "|---|---|---|---|",
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
            `- [${article.source}] ${article.title} (sinal ${article.engagement_score}) :: ${article.summary.slice(0, 240)}`,
        ),
      ].join("\n"),
    )
    .join("\n\n");
}

export function fallbackReading(buckets: RadarBucket[]): string {
  const top = dedupeByUrl(
    buckets
      .flatMap((bucket) => bucket.articles)
      .sort((left, right) => right.engagement_score - left.engagement_score),
  )
    .slice(0, 8)
    .map((article, index) => {
      const summary = article.summary.trim()
        ? ` — ${rowSummary(article.summary)}`
        : "";
      return `${index + 1}. **${cell(article.title)}** (${article.source})${summary}`;
    });
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
  "Formato exato: uma secao '## TL;DR' com 10 a 12 itens numerados,",
  "seguida de uma secao '## O que observar' com 3 bullets.",
  "Cada item do TL;DR e uma frase curta com um fato concreto (numero, nome de produto ou versao).",
  "Priorize releases de agentes de codigo, mudancas de API/preco e papers com mais votos; cubra frentes diferentes em vez de repetir o mesmo assunto.",
  "Nao invente dados: use apenas o que esta no material fornecido.",
  "Nao mostre raciocinio nem rascunho: a resposta comeca exatamente em '## TL;DR'.",
].join(" ");

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

  const launches = renderLaunchHighlights(articles, now);
  const prompt = [
    `Material coletado nas ultimas ${RADAR_WINDOW_HOURS} horas:`,
    "",
    radarDigestForModel(buckets),
    "",
    launches
      ? `Modelos lancados hoje (o item 1 do TL;DR obrigatoriamente cobre estes lancamentos):\n${launches}`
      : "",
    "Escreva em portugues do Brasil e nomeie o produto antes da versao (ex.: 'OpenAI Agents SDK v0.22.1').",
  ].join("\n");
  let reading: string | null = null;
  // The LiteLLM proxy caches by prompt, so a retry must differ to be re-sampled.
  for (let attempt = 1; attempt <= READING_ATTEMPTS && !reading; attempt++) {
    const retryNote =
      attempt > 1
        ? `\n\nTentativa ${attempt}: a anterior veio incompleta ou em ingles. Responda somente em portugues do Brasil.`
        : "";
    try {
      reading = extractReading(
        await ask(`${prompt}${retryNote}`, RADAR_SYSTEM_PROMPT, {
          maxOutputTokens: 4000,
        }),
      );
      if (!reading) log.warn(`Radar reading attempt ${attempt} unusable`);
    } catch (err) {
      log.warn(
        `Radar reading attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (!reading) {
    log.warn("Radar reading fell back to raw ranking");
    reading = fallbackReading(buckets);
  }

  const day = radarDate(now);
  const selected = dedupeByUrl(buckets.flatMap((bucket) => bucket.articles));
  const content = [
    launches,
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
