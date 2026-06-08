import { config } from "../config.js";
import type { Article } from "../knowledge/store.js";
import { db } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { log } from "../utils/logger.js";
import { getSystemPrompt } from "./improver.js";

function withModelFooter(content: string): string {
  return `${content}\n\n---\n\n*Gerado por: ${config.litellm.model}*`;
}

const askOpts = { maxOutputTokens: config.litellm.maxOutputTokens };

const CURATION_GUIDANCE =
  "Selecione APENAS os itens realmente interessantes/relevantes do período (lançamentos, mudanças de arquitetura, padrões, ferramentas, insights da comunidade). Resuma cada item em 2-4 frases densas — o que é e por que importa — sem encher linguiça e sem repetir. Priorize VARIEDADE de fontes e temas (largura) em vez de aprofundar um único tópico. Cada destaque DEVE citar a fonte como link [título](url) retirado da lista fornecida. TODAS as fontes relevantes fornecidas devem aparecer pelo menos uma vez no artigo.";

const MERMAID_GUIDANCE =
  "Quando for ilustrar uma tendência, fluxo ou arquitetura, use EXATAMENTE UM diagrama Mermaid em bloco ```mermaid (flowchart TD, sequenceDiagram ou graph LR), sintaticamente válido e autocontido. Regras obrigatórias: (1) use apenas TD ou LR como direção, (2) IDs dos nós sem espaços nem acentos (ex: NodeA, NodeB), (3) labels entre aspas duplas se tiverem espaços, (4) sem subgrafos aninhados complexos, (5) teste mental: o diagrama deve renderizar no mermaid.live. NUNCA escreva pseudocódigo — se não houver código real útil, use um diagrama simples ou texto.";

function clampContext(s: string, max = 120000): string {
  return s.length > max ? s.slice(0, max) : s;
}

function buildReferencesSection(articles: Article[]): string {
  if (articles.length === 0) return "";
  const lines = articles.map(
    (a, i) => `${i + 1}. [${a.title}](${a.url}) — ${a.source}`,
  );
  return ["## Fontes e Referências", "", ...lines].join("\n");
}

function normTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Cross-source deduplication: merge articles about the same story
// by normalizing titles and keeping the one with the highest engagement.
function deduplicateByStory(articles: Article[]): Article[] {
  const seen = new Map<string, Article>();
  for (const a of articles) {
    const key = normTitle(a.title);
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, a);
    } else {
      // Keep the one with higher engagement_score; break ties by recency
      const existingScore = existing.engagement_score ?? 0;
      const newScore = a.engagement_score ?? 0;
      if (newScore > existingScore) {
        seen.set(key, a);
      }
    }
  }
  return [...seen.values()];
}

// Coarse category so one channel (e.g. 6 Reddit feeds) can't dominate the digest.
function sourceBucket(source: string): string {
  if (/^reddit/i.test(source)) return "reddit";
  if (/^google news/i.test(source)) return "google-news";
  if (/^github trending/i.test(source)) return "github-trending";
  if (/^(x\/twitter|web search)/i.test(source)) return "websearch";
  if (/^hacker news/i.test(source)) return "hackernews";
  if (/^tabnews/i.test(source)) return "tabnews";
  if (/^searxng/i.test(source)) return "websearch";
  return source.toLowerCase().split(/[:(]/)[0].trim();
}

// Drop empty summaries, de-duplicate by normalized title, and cap per category.
// Sort by engagement_score descending so high-signal items surface first.
function curateArticles(
  articles: Article[],
  opts: { perBucket?: number; max?: number } = {},
): Article[] {
  const perBucket = opts.perBucket ?? Number.POSITIVE_INFINITY;
  const max = opts.max ?? Number.POSITIVE_INFINITY;
  const seen = new Set<string>();
  const bucketCount = new Map<string, number>();
  const out: Article[] = [];

  // Sort by engagement_score descending, then by crawled_at descending
  const sorted = [...articles].sort((a, b) => {
    const scoreDiff = (b.engagement_score ?? 0) - (a.engagement_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.crawled_at.localeCompare(a.crawled_at);
  });

  // Cross-source dedup: same story from different sources → keep highest engagement
  const deduped = deduplicateByStory(sorted);

  for (const a of deduped) {
    if (!a.summary || a.summary.trim().length === 0) continue;
    const key = normTitle(a.title);
    if (!key || seen.has(key)) continue;
    const bucket = sourceBucket(a.source);
    const bc = bucketCount.get(bucket) ?? 0;
    if (bc >= perBucket) continue;
    seen.add(key);
    bucketCount.set(bucket, bc + 1);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  content: string;
  summary: string;
  tags: string[];
  date: string;
  sources: string[];
  reportPeriod?: ReportPeriod;
}

function safeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractJsonObject(text: string): string | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/,\s*([}\]])/g, "$1");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return cleaned.slice(start, end + 1);
}

async function parseArticleJson(
  text: string,
  repairPrompt: string,
): Promise<Omit<GeneratedArticle, "date"> | null> {
  const json = extractJsonObject(text);
  if (json) {
    try {
      return JSON.parse(json) as Omit<GeneratedArticle, "date">;
    } catch (err) {
      log.warn(
        `Article JSON parse failed, asking model to repair: ${(err as Error).message}`,
      );
    }
  }

  try {
    const repaired = await ask(
      `Repair this response into valid JSON only, using the requested schema. Do not add markdown fences.\n\nSchema/request:\n${repairPrompt}\n\nResponse to repair:\n${text.slice(0, 8000)}`,
      "You repair malformed JSON. Return valid JSON only.",
    );
    const repairedJson = extractJsonObject(repaired);
    if (!repairedJson) throw new Error("No JSON in repaired response");
    return JSON.parse(repairedJson) as Omit<GeneratedArticle, "date">;
  } catch (err) {
    log.warn(`Article JSON repair failed: ${(err as Error).message}`);
    return null;
  }
}

function fallbackArticle(
  title: string,
  summary: string,
  content: string,
  sources: string[],
): Omit<GeneratedArticle, "date"> {
  return {
    title,
    slug: safeSlug(title),
    summary,
    tags: ["ai", "developers", "fallback"],
    sources,
    content,
  };
}

function markdownTitle(markdown: string, fallback: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function withoutTopTitle(markdown: string): string {
  return markdown.replace(/^#\s+.+\n+/, "").trim();
}

function markdownSummary(markdown: string, fallback: string): string {
  const paragraph = withoutTopTitle(markdown)
    .split(/\n{2,}/)
    .map((part) => part.replace(/[#*_`>\-[\]()]/g, "").trim())
    .find((part) => part.length > 80);
  return (paragraph ?? fallback).slice(0, 280);
}

export async function generateArticle(
  type: "daily" | "weekly" = "daily",
): Promise<GeneratedArticle> {
  const limit = type === "weekly" ? 150 : 60;
  const recentArticles = db.getRecentArticles(limit);
  const snippets = db.getSnippets(type === "weekly" ? 20 : 5);
  const systemPrompt = getSystemPrompt();

  const usedArticles = curateArticles(recentArticles, {
    perBucket: type === "weekly" ? 50 : 20,
    max: type === "weekly" ? 120 : 50,
  });
  const context = clampContext(
    usedArticles
      .map(
        (a) =>
          `- [${a.source}] ${a.title} (URL: ${a.url}): ${a.summary.slice(0, 350)}`,
      )
      .join("\n"),
  );

  const snippetContext =
    snippets.length > 0
      ? `\n\nRecently learned code patterns:\n${snippets.map((s) => `- ${s.title} (${s.language}) - Source: ${s.source_url}`).join("\n")}`
      : "";

  const todayDate = new Date();
  const today = todayDate.toISOString().split("T")[0];

  // Calculate week range (Sunday to Saturday)
  const firstDay = new Date(
    todayDate.setDate(todayDate.getDate() - todayDate.getDay()),
  );
  const lastDay = new Date(
    todayDate.setDate(todayDate.getDate() - todayDate.getDay() + 6),
  );
  const weekRange = `${firstDay.toISOString().split("T")[0]} até ${lastDay.toISOString().split("T")[0]}`;

  const fullSystemPrompt = `${systemPrompt}

Today is ${today}. The period of this report is from ${weekRange}. Write in Brazilian Portuguese.
Return Markdown only. Do not return JSON, YAML front matter, or code fences around the full answer.`;

  const userPromptDaily = `Based on these recent articles and developments:

${context}${snippetContext}

Write a curated digest in pt-BR of the most interesting recent developments for developers (focus on AI, LLMs and agent harnesses).

Return Markdown only.
The first line must be a single H1 title in pt-BR, for example:
# Titulo tecnico em pt-BR

Structure the body:
## Destaques
- 8 to 12 bullet items. Each item: **nome/tema curto em negrito** followed by a 2-4 sentence dense summary (what it is, why it matters), ending with a source link [titulo](url) taken from the list above.
## Tendências
1-2 short paragraphs connecting the highlights; include ONE Mermaid diagram only if it genuinely clarifies a flow or architecture.

${CURATION_GUIDANCE}

${MERMAID_GUIDANCE}`;

  const userPromptWeekly = `Based on the following content from the last 7 days:

${context}${snippetContext}

Write a curated WEEKLY digest in pt-BR for developers covering the most interesting developments in AI, LLMs and agent harnesses.

Return Markdown only.
The first line must be a single H1 title in pt-BR, for example:
# Relatorio semanal: titulo tecnico

Structure the body:
## Destaques da semana
- 12 to 18 bullet items. Each item: **nome/tema curto em negrito** + a 2-4 sentence dense summary (what it is, why it matters) + source link [titulo](url) taken from the list above.
## Tendências
2-3 short paragraphs on the week's trends; include ONE Mermaid diagram where it clarifies a flow or architecture.
## O que observar
A few short bullets on what to watch next week.

${CURATION_GUIDANCE}

${MERMAID_GUIDANCE}`;

  const userPrompt = type === "weekly" ? userPromptWeekly : userPromptDaily;

  log.info(`Generating ${type} article...`);
  let text: string;
  try {
    text = await ask(userPrompt, fullSystemPrompt, askOpts);
  } catch (err) {
    log.error(`Article generation failed: ${(err as Error).message}`);
    throw new Error(
      `LiteLLM generation failed - no fallback allowed: ${(err as Error).message}`,
    );
  }

  const content = withoutTopTitle(text);
  const references = buildReferencesSection(usedArticles);
  const title = markdownTitle(
    text,
    "Artigo tecnico de IA para desenvolvedores",
  );
  return {
    title,
    slug: safeSlug(title || `article-${today}`),
    summary: markdownSummary(
      text,
      "Artigo tecnico em pt-BR gerado a partir das fontes recentes.",
    ),
    tags:
      type === "weekly"
        ? ["weekly", "summary", "trends"]
        : ["ai", "developers"],
    sources: recentArticles
      .slice(0, type === "weekly" ? 10 : 5)
      .map((a) => a.url),
    content: withModelFooter(
      references ? `${content}\n\n${references}` : content,
    ),
    date: today,
  };
}

export async function generateWeeklyReport(): Promise<GeneratedArticle> {
  return generatePeriodReport("weekly");
}

export type ReportPeriod =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "semester";

interface PeriodConfig {
  days: number;
  label: string;
  highlights: [number, number];
}

const PERIOD_CONFIG: Record<ReportPeriod, PeriodConfig> = {
  weekly: { days: 7, label: "semanal", highlights: [12, 18] },
  biweekly: { days: 14, label: "quinzenal", highlights: [15, 22] },
  monthly: { days: 30, label: "mensal", highlights: [20, 30] },
  bimonthly: { days: 60, label: "bimestral", highlights: [25, 35] },
  semester: { days: 180, label: "semestral", highlights: [30, 45] },
};

function periodMeta(period: ReportPeriod) {
  const cfg = PERIOD_CONFIG[period];
  const todayDate = new Date();
  const sinceDate = new Date();
  sinceDate.setDate(todayDate.getDate() - cfg.days);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const periodStr = `${fmt(sinceDate)} a ${fmt(todayDate)}`;
  const today = todayDate.toISOString().split("T")[0];
  const titleLabel =
    period === "weekly"
      ? "Relatorio Semanal"
      : period === "biweekly"
        ? "Relatorio Quinzenal"
        : period === "monthly"
          ? "Relatorio Mensal"
          : period === "bimonthly"
            ? "Relatorio Bimestral"
            : "Relatorio Semestral";
  return { cfg, periodStr, today, titleLabel };
}

function loadPeriodArticles(cfg: PeriodConfig): Article[] {
  // Filter by date in SQL (indexed) and curate, instead of capping at the
  // 200 most recent rows — that cap made long periods only ever see ~1-2 days.
  return curateArticles(db.getArticlesSince(cfg.days), {
    perBucket: 80,
    max: 200,
  });
}

function snippetContextFrom(
  snippets: ReturnType<typeof db.getSnippets>,
): string {
  return snippets.length > 0
    ? `\n\nCode patterns/snippets learned this period:\n${snippets
        .map(
          (s) =>
            `- Title: ${s.title}\n  Language: ${s.language}\n  Explanation: ${s.explanation.slice(0, 300)}`,
        )
        .join("\n")}`
    : "";
}

function periodFallback(
  period: ReportPeriod,
  periodStr: string,
  today: string,
  titleLabel: string,
  recentArticles: Article[],
): GeneratedArticle {
  const sources = recentArticles.slice(0, 10);
  const title = `${titleLabel}: Resumo operacional (${periodStr})`;
  const content = [
    `**Período:** ${periodStr}`,
    "",
    "## Resumo do Período",
    "O modelo configurado via LiteLLM não retornou dentro do tempo limite. Este relatório foi publicado com base nas fontes coletadas mais recentes para manter o ciclo operacional.",
    "",
    "## Fontes recentes",
    ...sources.map(
      (a) => `- [${a.title}](${a.url}) — ${a.summary.slice(0, 240)}`,
    ),
  ].join("\n");
  return {
    ...fallbackArticle(
      title,
      `Resumo operacional do período ${periodStr} após timeout do modelo LiteLLM.`,
      withModelFooter(content),
      sources.map((a) => a.url),
    ),
    date: today,
    reportPeriod: period,
  };
}

export async function generatePeriodReport(
  period: ReportPeriod,
): Promise<GeneratedArticle> {
  if (period === "monthly" || period === "bimonthly" || period === "semester") {
    return generatePeriodReportMultiPass(period);
  }
  return generatePeriodReportSinglePass(period);
}

async function generatePeriodReportSinglePass(
  period: ReportPeriod,
): Promise<GeneratedArticle> {
  const { cfg, periodStr, today, titleLabel } = periodMeta(period);
  const recentArticles = loadPeriodArticles(cfg);
  if (recentArticles.length === 0) {
    throw new Error(
      `No articles crawled in the last ${cfg.days} days to generate a ${cfg.label} report`,
    );
  }
  const snippets = db.getSnippets(50);

  const systemPrompt = `You are a Principal AI Architect and technical newsletter editor.
You curate crawled AI research, news, and code snippets into a high-signal ${cfg.label} digest of only the most interesting developments.
Always write in Brazilian Portuguese (pt-BR).
Return Markdown only. Do not return JSON, YAML front matter, or code fences around the full answer.`;

  const context = clampContext(
    recentArticles
      .map(
        (a) =>
          `- [${a.source}] ${a.title} (URL: ${a.url}): ${a.summary.slice(0, 300)}`,
      )
      .join("\n"),
  );
  const snippetContext = snippetContextFrom(snippets);

  const userPrompt = `Based on everything crawled over the last ${cfg.days} days (Period: ${periodStr}):

${context}${snippetContext}

Write a curated ${cfg.label} digest in pt-BR of the most interesting developments in LLM, AI, and Agent Harnesses.
At the very top of the markdown body (after the H1 title), include:
**Periodo:** ${periodStr}

Structure the body:
## Destaques do período
- ${cfg.highlights[0]} to ${cfg.highlights[1]} bullet items. Each item: **nome/tema curto em negrito** + a 2-4 sentence dense summary (what it is, why it matters) + source link [titulo](url) taken from the list above.
## Tendências
2-3 short paragraphs on the period's trends; include ONE Mermaid diagram where it clarifies a flow or architecture.

Return Markdown only.
The first line must be a single H1 title in pt-BR, for example:
# ${titleLabel}: titulo tecnico do periodo

Use only facts from Period ${periodStr}. Do not mention months or dates outside this period.

${CURATION_GUIDANCE}

${MERMAID_GUIDANCE}`;

  log.info(
    `Generating ${cfg.label} report (single-pass, ${cfg.days}d period)...`,
  );
  let text: string;
  try {
    text = await ask(userPrompt, systemPrompt, askOpts);
  } catch (err) {
    log.error(`Report generation failed: ${(err as Error).message}`);
    throw new Error(
      `LiteLLM generation failed - no fallback allowed: ${(err as Error).message}`,
    );
  }

  const contentWithoutTitle = withoutTopTitle(text);
  const body = contentWithoutTitle.startsWith("**Per")
    ? contentWithoutTitle
    : `**Periodo:** ${periodStr}\n\n${contentWithoutTitle}`;
  const references = buildReferencesSection(recentArticles.slice(0, 60));
  const content = references ? `${body}\n\n${references}` : body;
  const title = `${titleLabel}: Panorama tecnico (${periodStr})`;

  return {
    title,
    slug: safeSlug(title),
    summary: markdownSummary(
      text,
      `Relatorio ${cfg.label} em pt-BR gerado a partir das fontes recentes.`,
    ),
    tags: [`${period}-report`, "ai-agents", "llm"],
    sources: recentArticles.slice(0, 10).map((a) => a.url),
    content: withModelFooter(content),
    date: today,
    reportPeriod: period,
  };
}

interface HighlightGroup {
  theme: string;
  itemIdx: number[];
}

async function selectHighlightGroups(
  cfg: PeriodConfig,
  periodStr: string,
  indexedContext: string,
): Promise<HighlightGroup[]> {
  const systemPrompt =
    "You are a technical news curator. Return valid JSON only.";
  const userPrompt = `From the indexed sources below (Period: ${periodStr}), select the most interesting developments and cluster them into 4-7 thematic groups for a ${cfg.label} digest.

Sources (each line is "[index] [source] title (url): summary"):
${indexedContext}

Return JSON only, no markdown fences:
{ "groups": [ { "theme": "short pt-BR theme title", "itemIdx": [0, 3, 7] } ] }

Pick only genuinely interesting items. Aim to cover ${cfg.highlights[0]}-${cfg.highlights[1]} items total across all groups. Use only indices that exist in the list above; never invent indices.`;
  const text = await ask(userPrompt, systemPrompt, askOpts);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { groups?: HighlightGroup[] };
    return (parsed.groups ?? []).filter(
      (g) => g?.theme && Array.isArray(g.itemIdx),
    );
  } catch {
    return [];
  }
}

async function summarizeGroup(
  group: HighlightGroup,
  periodStr: string,
  articles: Article[],
): Promise<string> {
  const items = group.itemIdx
    .filter((i) => Number.isInteger(i) && i >= 0 && i < articles.length)
    .map((i) => articles[i]);
  if (items.length === 0) return "";
  const list = items
    .map(
      (a) =>
        `- [${a.source}] ${a.title} (URL: ${a.url}): ${a.summary.slice(0, 350)}`,
    )
    .join("\n");
  const systemPrompt =
    "You write concise pt-BR technical digest sections. Return Markdown only.";
  const userPrompt = `Period: ${periodStr}. Theme: "${group.theme}".
Summarize ONLY the following sources into a digest section:
${list}

Return Markdown starting with the heading:
## ${group.theme}
Then one bullet per item: **nome/tema curto em negrito** + a 2-4 sentence dense summary (what it is, why it matters) + source link [titulo](url). Be concise; no filler.

${MERMAID_GUIDANCE}`;
  return ask(userPrompt, systemPrompt, askOpts);
}

async function buildTrendsSection(
  groups: HighlightGroup[],
  periodStr: string,
): Promise<string> {
  const themes = groups.map((g) => g.theme).join("; ");
  const systemPrompt =
    'You write a concise pt-BR "Tendências" section. Return Markdown only.';
  const userPrompt = `Period: ${periodStr}. Themes covered in this digest: ${themes}.
Write a "## Tendências" section: 2-3 short paragraphs connecting these themes, and include ONE Mermaid diagram (flowchart or architecture) only if it clarifies a flow or architecture.

${MERMAID_GUIDANCE}`;
  return ask(userPrompt, systemPrompt, askOpts);
}

async function generatePeriodReportMultiPass(
  period: ReportPeriod,
): Promise<GeneratedArticle> {
  const { cfg, periodStr, today, titleLabel } = periodMeta(period);
  const recentArticles = loadPeriodArticles(cfg);
  if (recentArticles.length === 0) {
    throw new Error(
      `No articles crawled in the last ${cfg.days} days to generate a ${cfg.label} report`,
    );
  }

  log.info(
    `Generating ${cfg.label} report (multi-pass, ${cfg.days}d period)...`,
  );
  const indexedContext = clampContext(
    recentArticles
      .map(
        (a, i) =>
          `[${i}] [${a.source}] ${a.title} (${a.url}): ${a.summary.slice(0, 300)}`,
      )
      .join("\n"),
  );

  const groupSections: string[] = [];
  let trends = "";
  try {
    const groups = await selectHighlightGroups(cfg, periodStr, indexedContext);
    if (groups.length === 0) {
      log.warn(
        "Multi-pass clustering returned no groups; falling back to single-pass digest",
      );
      return generatePeriodReportSinglePass(period);
    }
    for (const group of groups) {
      try {
        const section = await summarizeGroup(group, periodStr, recentArticles);
        if (section.trim()) groupSections.push(section.trim());
      } catch (err) {
        log.warn(`Group "${group.theme}" failed: ${(err as Error).message}`);
        groupSections.push(
          `## ${group.theme}\n\n_(seção indisponível nesta edição)_`,
        );
      }
    }
    try {
      trends = (await buildTrendsSection(groups, periodStr)).trim();
    } catch (err) {
      log.warn(`Trends section failed: ${(err as Error).message}`);
    }
  } catch (err) {
    log.error(`Multi-pass report failed: ${(err as Error).message}`);
    throw new Error(
      `LiteLLM generation failed - no fallback allowed: ${(err as Error).message}`,
    );
  }

  if (groupSections.length === 0) {
    throw new Error(
      "No valid groups generated - LiteLLM failed to produce content",
    );
  }

  const references = buildReferencesSection(recentArticles.slice(0, 60));
  const content = withModelFooter(
    [`**Periodo:** ${periodStr}`, "", ...groupSections, trends, references]
      .filter(Boolean)
      .join("\n\n"),
  );
  const title = `${titleLabel}: Panorama tecnico (${periodStr})`;

  return {
    title,
    slug: safeSlug(title),
    summary: markdownSummary(
      content,
      `Relatorio ${cfg.label} em pt-BR gerado a partir das fontes recentes.`,
    ),
    tags: [`${period}-report`, "ai-agents", "llm"],
    sources: recentArticles.slice(0, 10).map((a) => a.url),
    content,
    date: today,
    reportPeriod: period,
  };
}
