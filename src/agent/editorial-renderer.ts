import type { Article } from "../knowledge/store.js";
import {
  isCommunitySignal,
  isPrimarySource,
  parseTags,
  sourceBucket,
} from "./curation.js";
import {
  type EditorialDraft,
  hasEnglishSentence,
  hasModelArtifacts,
  hasPromptLeak,
  looksGarbled,
} from "./editorial.js";

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

function headlineText(headline: string): string {
  return sentence(headline).replace(/\.$/, "");
}

function sourceLabel(article: Article): string {
  const community = article.source.match(/\(([^)]+)\)/)?.[1];
  const name =
    sourceBucket(article.source) === "reddit" && community
      ? `Reddit r/${community}`
      : article.source;
  if (isPrimarySource(article)) return `${name} · fonte primária`;
  if (isCommunitySignal(article)) return `${name} · sinal da comunidade`;
  return name;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** First sentence of the agenda fact, bounded so the summary stays scannable. */
function leadSentence(text: string, max = 180): string {
  const first = text.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
  if (
    !first ||
    hasPromptLeak(first) ||
    hasEnglishSentence(first) ||
    looksGarbled(first) ||
    hasModelArtifacts(first)
  ) {
    return "";
  }
  if (first.length <= max) return sentence(first);
  const cut = first.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:]+$/, "")}…`;
}

export function renderEditorialDraft(
  draft: EditorialDraft,
  articles: Article[],
  period: string,
): string {
  const cited = draft.highlights.flatMap((highlight) => {
    const article = articles[highlight.sourceIndex];
    return article ? [{ highlight, article }] : [];
  });

  const sections = new Map<string, string[]>();
  for (const { highlight, article } of cited) {
    const body =
      highlight.analysis?.trim() ||
      `${sentence(highlight.whatHappened)} ${sentence(highlight.whyItMatters)}`;
    const item = [
      `#### ${headlineText(highlight.headline)}`,
      "",
      body,
      "",
      `*[Fonte: ${article.title}](${article.url}) · ${sourceLabel(article)}*`,
    ].join("\n");
    const theme = editorialTheme(article);
    sections.set(theme, [...(sections.get(theme) ?? []), item]);
  }

  const themed = [...sections.entries()].map(([theme, items]) =>
    [`### ${theme}`, "", items.join("\n\n")].join("\n"),
  );
  const overview = cited.map(({ highlight }) => {
    const lead = leadSentence(highlight.whatHappened);
    const headline = `- **${headlineText(highlight.headline)}**`;
    return lead ? `${headline} — ${lead}` : headline;
  });
  const primary = cited.filter(({ article }) => isPrimarySource(article));
  const community = cited.filter(
    ({ article }) => !isPrimarySource(article) && isCommunitySignal(article),
  );
  const stats = [
    period,
    plural(cited.length, "pauta", "pautas"),
    plural(primary.length, "fonte primária", "fontes primárias"),
    plural(community.length, "sinal da comunidade", "sinais da comunidade"),
  ].join(" · ");

  // The dek is left out on purpose: the page header already renders it.
  return [
    `**Período analisado:** ${stats}`,
    "",
    "## Em 30 segundos",
    "",
    ...overview,
    "",
    "## Destaques",
    "",
    themed.join("\n\n"),
    ...(draft.synthesis.trim()
      ? ["", "## Leitura do conjunto", "", draft.synthesis]
      : []),
  ].join("\n");
}

export function citedArticles(
  markdown: string,
  articles: Article[],
): Article[] {
  return articles.filter((article) => markdown.includes(`](${article.url})`));
}

export function articlesFromDraft(
  draft: EditorialDraft,
  articles: Article[],
): Article[] {
  return draft.highlights.flatMap((highlight) => {
    const article = articles[highlight.sourceIndex];
    return article ? [article] : [];
  });
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
                  : article.source.split(/[\s:]/)[0];
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
    // Internal crawl-engine identifier (crawler/index.ts), never a topic.
    "searxng",
  ]);
  const slugifyTag = (tag: string) =>
    tag
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  const sourceTags = [...groups.keys()].map(slugifyTag);
  const themeTags = [
    ...new Set(
      [...groups.values()].flatMap((articles) =>
        articles.flatMap((article) =>
          parseTags(article.tags)
            .filter((tag) => !ignored.has(tag))
            .map(slugifyTag)
            .slice(0, 2),
        ),
      ),
    ),
  ].slice(0, 8);
  return [...new Set([...sourceTags, ...themeTags])];
}
