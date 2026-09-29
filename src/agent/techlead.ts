import { db } from "../knowledge/store.js";
import type { Article } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { localDayIso } from "../utils/date.js";
import { log } from "../utils/logger.js";
import { UNTRUSTED_MATERIAL_RULE } from "./prompt-guards.js";
import type { GeneratedArticle } from "./types.js";

/**
 * Weekly digest for a tech lead: a short read about the stack in use, not a
 * sweep. Candidates are picked deterministically; the model only chooses and
 * explains, and any output that cites a URL outside the pool is discarded.
 */

export const TECHLEAD_WINDOW_DAYS = 7;
export const TECHLEAD_MAX_ITEMS = 5;
const PER_SOURCE = 3;
const PRERELEASE = /-(rc|alpha|beta)\.?\d*\b|\b(nightly|canary|preview)\b/i;
const URL_PATTERN = /https?:\/\/[^\s)<>\]]+/g;
// Older prompts asked for the unaccented label; models still echo it.
const ACTION_LABEL = /\*\*A[cç][aã]o:\*\*/g;

/** Newest stable items, capped per source and interleaved so no feed dominates. */
export function techleadCandidates(articles: Article[]): Article[] {
  const bySource = new Map<string, Article[]>();
  const seen = new Set<string>();
  const newestFirst = [...articles].sort((left, right) =>
    right.crawled_at.localeCompare(left.crawled_at),
  );
  for (const article of newestFirst) {
    if (PRERELEASE.test(article.title) || seen.has(article.url)) continue;
    seen.add(article.url);
    const list = bySource.get(article.source) ?? [];
    if (list.length < PER_SOURCE) list.push(article);
    bySource.set(article.source, list);
  }
  const lists = [...bySource.values()];
  const interleaved: Article[] = [];
  for (let round = 0; round < PER_SOURCE; round++) {
    for (const list of lists) if (list[round]) interleaved.push(list[round]);
  }
  return interleaved;
}

export function candidatesForModel(candidates: Article[]): string {
  return candidates
    .map(
      (article) =>
        `- ${article.title} | ${article.source} | ${article.url}\n  ${article.summary.replace(/\s+/g, " ").slice(0, 300)}`,
    )
    .join("\n");
}

const TECHLEAD_SYSTEM_PROMPT = [
  "Você seleciona leitura semanal para um tech lead que opera Bun, Hono, React,",
  "TypeScript, Node, k3s, Argo CD, Traefik, LiteLLM e PostgreSQL, e lidera um time.",
  `Escolha no máximo ${TECHLEAD_MAX_ITEMS} itens do material, priorizando mudança que exige ação`,
  "(breaking change, segurança, deprecação) e ideias de liderança aplicáveis.",
  "Responda em pt-BR com acentuação correta, sem introdução nem conclusão. Para cada item, exatamente:",
  "'### <título curto>', '**O que mudou:** <fato concreto>',",
  "'**Por que importa:** <impacto nesse stack ou time>',",
  "'**Ação:** testar | ler | ignorar', 'Fonte: <url exata do material>'.",
  "Use apenas URLs do material. Não invente versões nem números.",
  UNTRUSTED_MATERIAL_RULE,
].join(" ");

export function citedUrls(markdown: string): string[] {
  return [...markdown.matchAll(URL_PATTERN)].map((match) =>
    match[0].replace(/[.,;:]+$/, ""),
  );
}

/** Null when the reading breaks the contract and must not be published. */
export function validateReading(
  markdown: string,
  candidates: Article[],
): string | null {
  const items = markdown.match(/^### /gm)?.length ?? 0;
  if (items === 0 || items > TECHLEAD_MAX_ITEMS) return null;
  if ((markdown.match(ACTION_LABEL)?.length ?? 0) !== items) return null;
  const pool = new Set(candidates.map((article) => article.url));
  const urls = citedUrls(markdown);
  if (urls.length === 0 || urls.some((url) => !pool.has(url))) return null;
  return markdown.trim();
}

export function fallbackReading(candidates: Article[]): string {
  return candidates
    .slice(0, TECHLEAD_MAX_ITEMS)
    .map((article) =>
      [
        `### ${article.title}`,
        `**O que mudou:** ${article.summary.replace(/\s+/g, " ").slice(0, 200) || "ver fonte"}`,
        `**Por que importa:** seleção automática sem síntese (${article.source})`,
        "**Ação:** ler",
        `Fonte: ${article.url}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function withoutTracking(url: string): string {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.startsWith("utm_")) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

/** Validation runs on raw URLs; readers get a link without feed tracking. */
export function renderReading(markdown: string): string {
  return markdown
    .replace(ACTION_LABEL, "**Ação:**")
    .replace(
      /^(?:\*\*)?Fonte:(?:\*\*)?\s+(https?:\/\/\S+?)[.,;:]*[ \t]*$/gm,
      (line, url: string) => {
        if (!URL.canParse(url)) return line;
        // Parentheses would close the markdown link destination early.
        const clean = withoutTracking(url)
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29");
        const host = new URL(clean).hostname.replace(/^www\./, "");
        return `Fonte: [${host}](${clean})`;
      },
    );
}

export function techleadTitle(day: string): string {
  const [year, month, dayOfMonth] = day.split("-");
  return `Radar Techlead — ${dayOfMonth}/${month}/${year}`;
}

export interface TechleadDeps {
  load: () => Article[];
  ask: typeof ask;
}

const defaultDeps: TechleadDeps = {
  load: () => db.getTechleadArticlesSince(TECHLEAD_WINDOW_DAYS),
  ask,
};

export async function generateTechleadDigest(
  now = new Date(),
  deps: TechleadDeps = defaultDeps,
): Promise<GeneratedArticle> {
  const articles = deps.load();
  const candidates = techleadCandidates(articles);
  if (candidates.length === 0) {
    throw new Error(
      `Techlead digest has no articles in the last ${TECHLEAD_WINDOW_DAYS} days`,
    );
  }

  let reading: string | null = null;
  try {
    reading = validateReading(
      await deps.ask(
        `Material dos últimos ${TECHLEAD_WINDOW_DAYS} dias:\n\n${candidatesForModel(candidates)}`,
        TECHLEAD_SYSTEM_PROMPT,
        { maxOutputTokens: 1500 },
      ),
      candidates,
    );
    if (!reading)
      log.warn("Techlead reading broke the contract; using ranking");
  } catch (err) {
    log.warn(
      `Techlead reading fell back to ranking: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const content = reading ?? fallbackReading(candidates);
  const cited = new Set(citedUrls(content));
  const selected = candidates.filter((article) => cited.has(article.url));
  const sourceCount = new Set(candidates.map((article) => article.source)).size;

  const day = localDayIso(now);
  return {
    title: techleadTitle(day),
    slug: `techlead-${day}`,
    content: `${renderReading(content)}\n\n_${candidates.length} candidatos de ${sourceCount} fontes nos últimos ${TECHLEAD_WINDOW_DAYS} dias._`,
    summary: `${selected.length} leituras da semana sobre o stack e liderança.`,
    tags: ["techlead", "stack", "lideranca"],
    date: day,
    sources: selected.map((article) => article.url),
    evidence: selected.map((article) => ({
      sourceUrl: article.url,
      sourceTitle: article.title,
      excerpt: article.summary.slice(0, 400),
    })),
    editorialMetrics: {
      considered: articles.length,
      selected: selected.length,
      rejected: articles.length - selected.length,
      buckets: { techlead: candidates.length },
      primarySources: 0,
    },
    reportPeriod: "techlead",
  };
}
