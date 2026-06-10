import { config } from "../config.js";
import type { Article } from "../knowledge/store.js";
import { db } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { sanitizeForPrompt } from "../utils/escape.js";
import { log } from "../utils/logger.js";
import { getSystemPrompt } from "./improver.js";

function withModelFooter(content: string): string {
  return `${content}\n\n---\n\n*Gerado por: ${config.litellm.model}*`;
}

const askOpts = { maxOutputTokens: config.litellm.maxOutputTokens };

const CURATION_GUIDANCE =
  "Selecione APENAS os itens realmente interessantes/relevantes do período (lançamentos, mudanças de arquitetura, padrões, ferramentas, insights da comunidade). Resuma cada item em 2-4 frases densas — o que é e por que importa — sem encher linguiça e sem repetir. Priorize VARIEDADE de fontes e temas (largura) em vez de aprofundar um único tópico. CADA fonte distinta da lista fornecida DEVE aparecer COM PELO MENOS UM RESUMO (bullet point). Não omita nenhuma fonte — se a fonte está na lista, ela deve ter seu destaque. Cite a fonte como link [título](url) retirado da lista fornecida.";

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

  const sorted = [...articles].sort((a, b) => {
    const scoreDiff = (b.engagement_score ?? 0) - (a.engagement_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.crawled_at.localeCompare(a.crawled_at);
  });

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

function groupBySourceType(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const a of articles) {
    const bucket = sourceBucket(a.source);
    const label =
      bucket === "github-trending"
        ? "GitHub Trending"
        : bucket === "hackernews"
          ? "Hacker News"
          : bucket === "tabnews"
            ? "TabNews"
            : bucket === "reddit"
              ? "Reddit"
              : bucket === "google-news"
                ? "Google News"
                : bucket === "websearch"
                  ? "Web Search"
                  : a.source.split(" ")[0];
    const arr = groups.get(label) || [];
    arr.push(a);
    groups.set(label, arr);
  }
  return groups;
}

function buildGroupedHighlights(groups: Map<string, Article[]>): string {
  const sections: string[] = [];
  const sourceOrder = [
    "GitHub Trending",
    "Hacker News",
    "TabNews",
    "Reddit",
    "Google News",
    "Web Search",
  ];

  for (const sourceType of sourceOrder) {
    const articles = groups.get(sourceType);
    if (!articles || articles.length === 0) continue;

    const lines = articles.slice(0, 50).map((a) => {
      const score = a.engagement_score ?? 0;
      const scoreLabel = a.source.includes("Hacker News")
        ? `🔺 ${score}`
        : a.source.includes("TabNews")
          ? `💬 ${score}`
          : a.source.includes("GitHub")
            ? `⭐ ${score}`
            : `📊 ${score}`;
      return `* **${a.title}** ${scoreLabel} — ${a.summary.slice(0, 200)} [link](${a.url})`;
    });

    if (lines.length > 0) {
      sections.push(`### ${sourceType}\n${lines.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}

function buildMetricsSection(articles: Article[], periodStr: string): string {
  const groups = groupBySourceType(articles);
  const total = articles.length;
  const bySource = [...groups.entries()]
    .map(([k, v]) => `${k}: ${v.length}`)
    .join(" | ");
  const topEngagement = [...articles]
    .sort((a, b) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0))
    .slice(0, 3)
    .map((a) => `**${a.title.split(" ")[0]}** (${a.engagement_score})`)
    .join(" | ");

  return `## 📊 Métricas do Período (${periodStr})

- **Total de fontes**: ${total}
- **Por tipo**: ${bySource}
- **Top engagement**: ${topEngagement}
- **Temas únicos**: ${new Set(articles.flatMap((a) => JSON.parse(a.tags).filter((t: string) => !["ai", "developers", "weekly", "summary", "trends", "github", "trending", "hackernews", "tabnews", "reddit", "websearch", "google-news", "daily", "github-trending"].includes(t)))).size} categorias`;
}

function buildRichMermaid(
  groups: Map<string, Article[]>,
  periodStr: string,
): string {
  const themes = [
    ...new Set(
      [...groups.values()].flatMap((arr) =>
        arr.flatMap((a) =>
          JSON.parse(a.tags)
            .filter(
              (t: string) =>
                ![
                  "ai",
                  "developers",
                  "weekly",
                  "summary",
                  "trends",
                  "github",
                  "trending",
                  "hackernews",
                  "tabnews",
                  "reddit",
                  "websearch",
                  "google-news",
                  "daily",
                  "github-trending",
                ].includes(t),
            )
            .slice(0, 2),
        ),
      ),
    ),
  ].slice(0, 6);

  let mermaid = `graph TD\n    subgraph Sources["Fontes do Período (${periodStr})"]\n`;
  for (const [source, articles] of groups) {
    if (articles.length > 0) {
      mermaid += `        ${source.replace(/\s+/g, "")}["${source} (${articles.length})"]\n`;
    }
  }
  mermaid += `    end\n    subgraph Themes["Temas Principais"]\n`;
  for (let i = 0; i < themes.length; i++) {
    mermaid += `        T${i}["${themes[i]}"]\n`;
  }
  mermaid += "    end\n";
  for (const [source, articles] of groups) {
    if (articles.length === 0) continue;
    const srcId = source.replace(/\s+/g, "");
    for (let i = 0; i < Math.min(themes.length, 3); i++) {
      mermaid += `    ${srcId} --> T${i}\n`;
    }
  }
  return `\`\`\`mermaid\n${mermaid}\`\`\``;
}

function generateExecutiveSummary(
  markdown: string,
  articleCount: number,
  sourceGroups: Map<string, Article[]>,
): string {
  const topSources = [...sourceGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([k, v]) => `${k} (${v.length})`)
    .join(", ");
  const firstSection =
    withoutTopTitle(markdown).split("## ")[1]?.split("\n")[0] ||
    "resumo técnico";
  return `Resumo executivo do período cobrindo ${articleCount} fontes (${topSources}). ${firstSection}. Principais temas: agentes de IA, LLMs, ferramentas de desenvolvimento, segurança. Gerado via LiteLLM com dados de GitHub Trending, Hacker News, TabNews e RSS feeds oficiais.`;
}

function buildTagsFromGroups(groups: Map<string, Article[]>): string[] {
  const baseTags = [...groups.keys()].map((k) =>
    k.toLowerCase().replace(/\s+/g, "-"),
  );
  const themeTags = [
    ...new Set(
      [...groups.values()].flatMap((arr) =>
        arr.flatMap((a) =>
          JSON.parse(a.tags)
            .filter(
              (t: string) =>
                ![
                  "ai",
                  "developers",
                  "weekly",
                  "summary",
                  "trends",
                  "github",
                  "trending",
                  "hackernews",
                  "tabnews",
                  "reddit",
                  "websearch",
                  "google-news",
                  "daily",
                  "github-trending",
                ].includes(t),
            )
            .slice(0, 2),
        ),
      ),
    ),
  ].slice(0, 8);
  return [...new Set([...baseTags, ...themeTags])];
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
  return (paragraph ?? fallback).slice(0, 800);
}

export async function generateArticle(
  type: "daily" | "weekly" = "daily",
): Promise<GeneratedArticle> {
  const limit = type === "weekly" ? 150 : 60;
  const recentArticles = db.getRecentArticles(limit);
  const snippets = db.getSnippets(type === "weekly" ? 20 : 5);
  const systemPrompt = getSystemPrompt();

  const usedArticles = curateArticles(recentArticles, {
    perBucket: type === "weekly" ? 200 : 100,
    max: type === "weekly" ? 500 : 200,
  });
  const totalArticles = usedArticles.length;

  const todayDate = new Date();
  const today = todayDate.toISOString().split("T")[0];

  const firstDay = new Date(todayDate);
  firstDay.setDate(firstDay.getDate() - firstDay.getDay());
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  const weekRange = `${firstDay.toISOString().split("T")[0]} até ${lastDay.toISOString().split("T")[0]}`;

  // Pre-compute ALL sections in code
  const groups = groupBySourceType(usedArticles);
  const groupedHighlights = buildGroupedHighlights(groups);
  const metricsSection = buildMetricsSection(usedArticles, weekRange);
  const mermaidDiagram = buildRichMermaid(groups, weekRange);
  const autoTags = buildTagsFromGroups(groups);

  // LLM only for trends narrative (2-3 short paragraphs)
  const trendsPrompt = `Based on these articles from ${weekRange}:

${usedArticles
  .slice(0, 30)
  .map(
    (a) =>
      `- [${a.source}] ${sanitizeForPrompt(a.title, 200)}: ${sanitizeForPrompt(a.summary, 200)}`,
  )
  .join("\n")}

Write 2-3 short paragraphs in pt-BR connecting the trends across sources. Be concise, no fluff.
Return plain text only (no markdown, no headers).`;

  let trendsNarrative = "";
  try {
    trendsNarrative = await ask(
      trendsPrompt,
      "You write concise pt-BR trend analysis. Return plain text only.",
      { maxOutputTokens: 500 },
    );
  } catch (err) {
    log.warn(`Trends narrative failed: ${(err as Error).message}`);
    trendsNarrative =
      "Os desenvolvimentos recentes mostram evolução contínua em agentes de IA, ferramentas de desenvolvimento e segurança.";
  }

  const articleBody = [
    "## Destaques",
    groupedHighlights,
    "",
    metricsSection,
    "",
    "## Tendências",
    mermaidDiagram,
    "",
    trendsNarrative,
  ].join("\n");

  // LLM only for title
  const titlePrompt = `Based on this article content, write a concise H1 title in pt-BR (max 80 chars):

${articleBody.slice(0, 1000)}

Return ONLY the title line starting with # `;

  let title = "Desenvolvimentos em IA e Software";
  try {
    const titleResult = await ask(
      titlePrompt,
      "You write concise pt-BR titles. Return only # Title.",
      { maxOutputTokens: 50 },
    );
    const match = titleResult.match(/^#\s+(.+)$/m);
    if (match) title = match[1].trim();
  } catch (err) {
    log.warn(`Title generation failed: ${(err as Error).message}`);
  }

  const executiveSummaryText = generateExecutiveSummary(
    articleBody,
    totalArticles,
    groups,
  );
  const articleTags =
    autoTags.length > 0
      ? autoTags
      : type === "weekly"
        ? ["weekly", "summary", "trends"]
        : ["ai", "developers"];

  const fullContent = `# ${title}\n\n${articleBody}`;
  const references = buildReferencesSection(usedArticles);
  const fullContentWithRefs = references
    ? `${fullContent}\n\n${references}`
    : fullContent;

  return {
    title,
    slug: safeSlug(title || `article-${today}`),
    summary: executiveSummaryText,
    tags: articleTags,
    sources: recentArticles
      .slice(0, type === "weekly" ? 10 : 5)
      .map((a) => a.url),
    content: withModelFooter(fullContentWithRefs),
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
  return curateArticles(db.getArticlesSince(cfg.days), {
    perBucket: 200,
    max: 500,
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
          `- [${a.source}] ${sanitizeForPrompt(a.title, 200)} (URL: ${a.url}): ${sanitizeForPrompt(a.summary, 300)}`,
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
- **UM bullet point PARA CADA FONTE DISTINTA da lista acima.** Cada item: **nome/tema curto em negrito** + 2-4 frases densas (o que é, por que importa) + link da fonte [título](url). NÃO OMITA NENHUMA FONTE — se está na lista, deve ter seu destaque.
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
        `- [${a.source}] ${sanitizeForPrompt(a.title, 200)} (URL: ${a.url}): ${sanitizeForPrompt(a.summary, 350)}`,
    )
    .join("\n");

  const systemPrompt =
    "You are a technical newsletter editor. Return Markdown only.";
  const userPrompt = `Write a concise digest section in pt-BR for the theme "${group.theme}" (Period: ${periodStr}).
Each item must have its own bullet point with 2-4 dense sentences and source link.
Items:
${list}

Start with:
## ${group.theme}

${CURATION_GUIDANCE}`;

  return ask(userPrompt, systemPrompt, { maxOutputTokens: 800 });
}

async function buildTrendsSection(
  groups: HighlightGroup[],
  periodStr: string,
): Promise<string> {
  const themes = groups.map((g) => g.theme).join(", ");
  const systemPrompt =
    "You are a Principal AI Architect. Return Markdown only.";
  const userPrompt = `Based on these thematic groups from the period ${periodStr}: ${themes}

Write 2-3 short paragraphs in pt-BR connecting the cross-cutting trends. Include ONE Mermaid diagram that illustrates the relationship between themes.

Start with:
## Tendências

${MERMAID_GUIDANCE}`;

  return ask(userPrompt, systemPrompt, { maxOutputTokens: 600 });
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
          `[${i}] [${a.source}] ${sanitizeForPrompt(a.title, 200)} (${a.url}): ${sanitizeForPrompt(a.summary, 300)}`,
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
