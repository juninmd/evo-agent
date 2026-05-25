import { db } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { log } from "../utils/logger.js";
import { getSystemPrompt } from "./improver.js";

export interface GeneratedArticle {
  title: string;
  slug: string;
  content: string;
  summary: string;
  tags: string[];
  date: string;
  sources: string[];
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
Always respond with valid JSON only.
CRITICAL: Ensure the JSON is perfectly formatted. Escape all quotes (\\"), newlines (\\n), and control characters inside the "content" field.`;

  const userPromptDaily = `Based on these recent articles and developments:

${context}${snippetContext}

Write a high-quality technical article for developers about an important topic from this content.
The article should be insightful, practical, and showcase deep understanding.

Return JSON:
{
  "title": "Article title in pt-BR",
  "slug": "url-friendly-slug",
  "summary": "2-3 sentence summary in pt-BR",
  "tags": ["tag1", "tag2", "tag3"],
  "sources": ["url1", "url2"],
  "content": "Full markdown article in pt-BR (800-1200 words, include code examples where relevant)"
}`;

  const userPromptWeekly = `Based on the following content from the last 7 days:

${context}${snippetContext}

Write a comprehensive WEEKLY SUMMARY for developers. 
The summary should:
1. Identify the 3 most significant trends of the week.
2. Provide a deep dive into the most technical advancement.
3. Summarize the best code patterns or tools discovered.
4. Conclude with a "What to watch next week" section.

Return JSON:
{
  "title": "Weekly Report: [Short Catchy Title] (Period ${weekRange})",
  "slug": "weekly-report-${today}",
  "summary": "Brief overview of the week's tech landscape in pt-BR",
  "tags": ["weekly", "summary", "trends"],
  "sources": ["url1", "url2", "..."],
  "content": "Full markdown report in pt-BR (1500-2000 words, well structured with headings)"
}`;

  const userPrompt = type === "weekly" ? userPromptWeekly : userPromptDaily;

  log.info(`Generating ${type} article...`);
  const text = await ask(userPrompt, fullSystemPrompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const result = JSON.parse(jsonMatch[0]) as Omit<GeneratedArticle, "date">;
  return { ...result, date: today };
}

export async function generateWeeklyReport(): Promise<GeneratedArticle> {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const recentArticles = db.getRecentArticles(100).filter((a) => {
    const crawledDate = new Date(a.crawled_at);
    return crawledDate >= lastWeek;
  });

  const snippets = db.getSnippets(30).filter((s) => {
    const createdDate = new Date(s.created_at);
    return createdDate >= lastWeek;
  });

  if (recentArticles.length === 0) {
    throw new Error(
      "No articles crawled in the last 7 days to generate a weekly report",
    );
  }

  const systemPrompt = `You are a Principal AI Architect and technical newsletter editor.
You analyze a week's worth of crawled AI research, news, and code snippets, synthesizing them into a high-quality, comprehensive weekly technical report.
Your output must be deeply technical, insightful, structured, and practical.
Always write in Brazilian Portuguese (pt-BR).
Always respond with valid JSON only.`;

  const context = recentArticles
    .map((a) => `- [${a.source}] ${a.title}: ${a.summary.slice(0, 250)}`)
    .join("\n");

  const snippetContext =
    snippets.length > 0
      ? `\n\nCode patterns/snippets learned this week:\n${snippets
          .map(
            (s) =>
              `- Title: ${s.title}\n  Language: ${s.language}\n  Explanation: ${s.explanation}\n  Code:\n  \`\`\`${s.language}\n  ${s.code}\n  \`\`\``,
          )
          .join("\n\n")}`
      : "";

  const todayDate = new Date();
  const lastWeekDate = new Date();
  lastWeekDate.setDate(todayDate.getDate() - 7);

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const periodStr = `${formatDate(lastWeekDate)} a ${formatDate(todayDate)}`;
  const today = todayDate.toISOString().split("T")[0];

  const userPrompt = `Based on everything crawled and learned over the last 7 days (Period: ${periodStr}):

${context}${snippetContext}

Write a comprehensive weekly technical report summarizing the main developments in LLM, AI, and Agent Harnesses.
At the very top of the markdown "content" (before any other text), you MUST include:
**Período:** ${periodStr}

Structure the report using Markdown. Organize it into sections like:
1. Resumo da Semana (Executive Summary)
2. Grandes Lançamentos e Notícias (Key Releases & News)
3. Análise de Arquitetura de Agentes (Deep analysis of Agent Harnesses / AI architecture trends based on content)
4. Melhores Práticas e Padrões de Código (Highlights of the code snippets learned, explaining why they are useful)
5. Conclusão e Próximos Passos (Future outlook)

The report should be extensive, informative (1200-2000 words), and highly technical.

Return JSON:
{
  "title": "Weekly Report title in pt-BR",
  "slug": "weekly-friendly-slug",
  "summary": "2-3 sentence summary of the weekly report in pt-BR",
  "tags": ["weekly-report", "ai-agents", "llm"],
  "content": "Full markdown report in pt-BR"
}`;

  log.info("Generating weekly report...");
  const text = await ask(userPrompt, systemPrompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in weekly report response");

  const result = JSON.parse(jsonMatch[0]) as Omit<GeneratedArticle, "date">;
  return { ...result, date: today };
}
