import type { Article } from "../knowledge/store.js";
import { parseTags, sourceBucket } from "./curation.js";
import type { EditorialDraft } from "./editorial.js";

export function buildReferencesSection(articles: Article[]): string {
  if (articles.length === 0) return "";
  const lines = articles.map(
    (article, index) =>
      `${index + 1}. [${article.title}](${article.url}) — ${article.source}`,
  );
  return ["## Fontes e Referências", "", ...lines].join("\n");
}

function editorialTheme(article: Article): string {
  const text =
    `${article.title} ${parseTags(article.tags).join(" ")}`.toLowerCase();
  if (/security|seguran|vulnerab|secret|attack|privacy/.test(text)) {
    return "Segurança e confiança";
  }
  if (/agent|mcp|harness|workflow|codex|copilot|claude code/.test(text)) {
    return "Agentes e ferramentas de desenvolvimento";
  }
  if (/model|llm|gemini|claude|gpt|mistral|qwen|deepseek/.test(text)) {
    return "Modelos e pesquisa";
  }
  if (/infra|cloud|gpu|inference|latency|cost|custo|database/.test(text)) {
    return "Infraestrutura e eficiência";
  }
  return "Engenharia e ecossistema";
}

function sentence(value: string): string {
  const clean = value.trim().replace(/\s+/g, " ");
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

export function renderEditorialDraft(
  draft: EditorialDraft,
  articles: Article[],
  period: string,
): string {
  const sections = new Map<string, string[]>();
  for (const highlight of draft.highlights) {
    const article = articles[highlight.sourceIndex];
    if (!article) continue;
    const theme = editorialTheme(article);
    const item = `- **${sentence(highlight.headline)}** ${sentence(highlight.whatHappened)} **Por que importa:** ${sentence(highlight.whyItMatters)} [Fonte: ${article.title}](${article.url})`;
    sections.set(theme, [...(sections.get(theme) ?? []), item]);
  }

  const highlights = [...sections.entries()]
    .map(([theme, items]) => `### ${theme}\n\n${items.join("\n")}`)
    .join("\n\n");

  return [
    `**Período analisado:** ${period}`,
    "",
    draft.dek,
    "",
    "## Destaques",
    "",
    highlights,
    "",
    "## Leitura do conjunto",
    "",
    draft.synthesis,
  ].join("\n");
}

export function citedArticles(
  markdown: string,
  articles: Article[],
): Article[] {
  return articles.filter((article) => markdown.includes(`](${article.url})`));
}

export function groupBySourceType(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    const bucket = sourceBucket(article.source);
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
                  : article.source.split(" ")[0];
    groups.set(label, [...(groups.get(label) ?? []), article]);
  }
  return groups;
}

export function buildTagsFromGroups(groups: Map<string, Article[]>): string[] {
  const ignored = new Set([
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
  ]);
  const sourceTags = [...groups.keys()].map((key) =>
    key.toLowerCase().replace(/\s+/g, "-"),
  );
  const themeTags = [
    ...new Set(
      [...groups.values()].flatMap((articles) =>
        articles.flatMap((article) =>
          parseTags(article.tags)
            .filter((tag) => !ignored.has(tag))
            .slice(0, 2),
        ),
      ),
    ),
  ].slice(0, 8);
  return [...new Set([...sourceTags, ...themeTags])];
}
