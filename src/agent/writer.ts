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
}

export async function generateDailyArticle(): Promise<GeneratedArticle> {
  const recentArticles = db.getRecentArticles(30);
  const snippets = db.getSnippets(5);
  const systemPrompt = getSystemPrompt();

  const context = recentArticles
    .slice(0, 15)
    .map((a) => `- [${a.source}] ${a.title}: ${a.summary.slice(0, 300)}`)
    .join("\n");

  const snippetContext =
    snippets.length > 0
      ? `\n\nRecently learned code patterns:\n${snippets.map((s) => `- ${s.title} (${s.language})`).join("\n")}`
      : "";

  const todayDate = new Date();
  const today = todayDate.toISOString().split("T")[0];

  // Calculate week range (Sunday to Saturday)
  const firstDay = new Date(todayDate.setDate(todayDate.getDate() - todayDate.getDay()));
  const lastDay = new Date(todayDate.setDate(todayDate.getDate() - todayDate.getDay() + 6));
  const weekRange = `${firstDay.toISOString().split("T")[0]} até ${lastDay.toISOString().split("T")[0]}`;

  const fullSystemPrompt = `${systemPrompt}

Today is ${today}. The period of this report is from ${weekRange}. Write in Brazilian Portuguese.
Always respond with valid JSON only.`;

  const userPrompt = `Based on these recent articles and developments:

${context}${snippetContext}

Write a high-quality technical article for developers about an important topic from this content.
The article should be insightful, practical, and showcase deep understanding.

Return JSON:
{
  "title": "Article title in pt-BR",
  "slug": "url-friendly-slug",
  "summary": "2-3 sentence summary in pt-BR",
  "tags": ["tag1", "tag2", "tag3"],
  "content": "Full markdown article in pt-BR (800-1200 words, include code examples where relevant)"
}`;

  log.info("Generating daily article...");
  const text = await ask(userPrompt, fullSystemPrompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const result = JSON.parse(jsonMatch[0]) as Omit<GeneratedArticle, "date">;
  return { ...result, date: today };
}
