import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { log } from "../utils/logger.js";
import { getSystemPrompt } from "./improver.js";

function withModelFooter(content: string): string {
  return `${content}\n\n---\n\n*Gerado por: ${config.litellm.model}*`;
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
  const limit = type === "weekly" ? 100 : 30;
  const recentArticles = db.getRecentArticles(limit);
  const snippets = db.getSnippets(type === "weekly" ? 20 : 5);
  const systemPrompt = getSystemPrompt();

  const context = recentArticles
    .slice(0, type === "weekly" ? 50 : 15)
    .map(
      (a) =>
        `- [${a.source}] ${a.title} (URL: ${a.url}): ${a.summary.slice(0, 300)}`,
    )
    .join("\n");

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

Write a high-quality technical article for developers about an important topic from this content.
The article should be insightful, practical, and showcase deep understanding.

Return Markdown only.
The first line must be a single H1 title in pt-BR, for example:
# Titulo tecnico em pt-BR

Then write the full article in pt-BR (800-1200 words), with practical sections and code examples where relevant.`;

  const userPromptWeekly = `Based on the following content from the last 7 days:

${context}${snippetContext}

Write a comprehensive WEEKLY SUMMARY for developers. 
The summary should:
1. Identify the 3 most significant trends of the week.
2. Provide a deep dive into the most technical advancement.
3. Summarize the best code patterns or tools discovered.
4. Conclude with a "What to watch next week" section.

Return Markdown only.
The first line must be a single H1 title in pt-BR, for example:
# Relatorio semanal: titulo tecnico

Then write the full weekly report in pt-BR (1500-2000 words), well structured with headings.`;

  const userPrompt = type === "weekly" ? userPromptWeekly : userPromptDaily;

  log.info(`Generating ${type} article...`);
  let text: string;
  try {
    text = await ask(userPrompt, fullSystemPrompt);
  } catch (err) {
    log.warn(
      `Article generation failed, using source-based fallback: ${(err as Error).message}`,
    );
    const sources = recentArticles.slice(0, 5);
    const title = "Resumo técnico de IA para desenvolvedores";
    const content = [
      "## Resumo",
      "O modelo configurado via LiteLLM não retornou dentro do tempo limite. Este artigo foi publicado com base nas fontes coletadas mais recentes para manter o ciclo operacional.",
      "",
      "## Fontes recentes",
      ...sources.map(
        (a) => `- [${a.title}](${a.url}) — ${a.summary.slice(0, 240)}`,
      ),
    ].join("\n");
    return {
      ...fallbackArticle(
        title,
        "Resumo operacional gerado a partir das fontes recentes após timeout do modelo LiteLLM.",
        withModelFooter(content),
        sources.map((a) => a.url),
      ),
      date: today,
    };
  }

  const content = withoutTopTitle(text);
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
    content: withModelFooter(content),
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

const PERIOD_CONFIG: Record<
  ReportPeriod,
  { days: number; label: string; wordCount: [number, number] }
> = {
  weekly: { days: 7, label: "semanal", wordCount: [1200, 2000] },
  biweekly: { days: 14, label: "quinzenal", wordCount: [1500, 2500] },
  monthly: { days: 30, label: "mensal", wordCount: [2000, 3000] },
  bimonthly: { days: 60, label: "bimestral", wordCount: [2500, 4000] },
  semester: { days: 180, label: "semestral", wordCount: [3500, 5000] },
};

export async function generatePeriodReport(
  period: ReportPeriod,
): Promise<GeneratedArticle> {
  const cfg = PERIOD_CONFIG[period];
  const since = new Date();
  since.setDate(since.getDate() - cfg.days);

  const recentArticles = db.getRecentArticles(200).filter((a) => {
    const crawledDate = new Date(a.crawled_at);
    return crawledDate >= since;
  });

  const snippets = db.getSnippets(50);

  if (recentArticles.length === 0) {
    throw new Error(
      `No articles crawled in the last ${cfg.days} days to generate a ${cfg.label} report`,
    );
  }

  const systemPrompt = `You are a Principal AI Architect and technical newsletter editor.
You analyze crawled AI research, news, and code snippets, synthesizing them into a high-quality, comprehensive ${cfg.label} technical report.
Your output must be deeply technical, insightful, structured, and practical.
Always write in Brazilian Portuguese (pt-BR).
Return Markdown only. Do not return JSON, YAML front matter, or code fences around the full answer.`;

  const context = recentArticles
    .map((a) => `- [${a.source}] ${a.title}: ${a.summary.slice(0, 250)}`)
    .join("\n");

  const snippetContext =
    snippets.length > 0
      ? `\n\nCode patterns/snippets learned this period:\n${snippets
          .map(
            (s) =>
              `- Title: ${s.title}\n  Language: ${s.language}\n  Explanation: ${s.explanation.slice(0, 300)}\n  Code:\n  \`\`\`${s.language}\n  ${s.code.slice(0, 600)}\n  \`\`\``,
          )
          .join("\n\n")}`
      : "";

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

  const userPrompt = `Based on everything crawled and learned over the last ${cfg.days} days (Period: ${periodStr}):

${context}${snippetContext}

Write a comprehensive ${cfg.label} technical report summarizing the main developments in LLM, AI, and Agent Harnesses.
At the very top of the markdown body (after the H1 title), include:
**Periodo:** ${periodStr}

Structure the report using Markdown. Organize it into sections like:
1. Resumo do Periodo (Executive Summary)
2. Grandes Lancamentos e Noticias (Key Releases & News)
3. Analise de Arquitetura de Agentes (Deep analysis of Agent Harnesses / AI architecture trends)
4. Melhores Praticas e Padroes de Codigo (Code patterns and best practices)
5. Conclusao e Proximos Passos (Future outlook)

The report should be extensive, informative (${cfg.wordCount[0]}-${cfg.wordCount[1]} words), and highly technical.

Return Markdown only.
The first line must be a single H1 title in pt-BR, for example:
# ${titleLabel}: titulo tecnico do periodo

Use only facts from Period ${periodStr}. Do not mention months or dates outside this period.
Do not return JSON.`;
  log.info(`Generating ${cfg.label} report (${cfg.days}d period)...`);
  let text: string;
  try {
    text = await ask(userPrompt, systemPrompt);
  } catch (err) {
    log.warn(
      `Report generation failed, using source-based fallback: ${(err as Error).message}`,
    );
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
    };
  }

  const contentWithoutTitle = withoutTopTitle(text);
  const content = contentWithoutTitle.startsWith("**Per")
    ? contentWithoutTitle
    : `**Periodo:** ${periodStr}\n\n${contentWithoutTitle}`;
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
