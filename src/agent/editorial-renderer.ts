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
      `${index + 1}. [${displayTitle(article)}](${article.url}) — ${sourceName(article)}`,
  );
  return ["## Fontes e Referências", "", ...lines].join("\n");
}

// Whole words only: "litellm" once matched "llm" and a supply-chain story
// landed under models. The source joins the text because a subreddit name
// ("ClaudeCode", "vscode") is often the only hint of what a post is about.
const THEMES: [RegExp, string][] = [
  [
    /\b(security|seguran\w*|vulnerab\w*|secrets?|attacks?|privacy|cosign|supply[- ]chain|assinatura|signed|signing)\b/,
    "Segurança e confiança",
  ],
  [
    /\b(agents?|agentes?|mcp|harness|workflows?|codex|copilot|githubcopilot|claude ?code|vs ?code|cursor|ide|cli|sdk)\b/,
    "Agentes e ferramentas de desenvolvimento",
  ],
  [
    /\b(models?|modelos?|llms?|gemini|claude|gpt[-\w.]*|mistral|qwen[\w.]*|deepseek|benchmarks?|ranking)\b/,
    "Modelos e pesquisa",
  ],
  [
    /\b(infra\w*|cloud|gpus?|inference|latency|costs?|custos?|database|gateways?|proxy)\b/,
    "Infraestrutura e eficiência",
  ],
];

export function editorialTheme(article: Article): string {
  const text =
    `${article.title} ${parseTags(article.tags).join(" ")} ${article.source}`.toLowerCase();
  return (
    THEMES.find(([pattern]) => pattern.test(text))?.[1] ??
    "Engenharia e ecossistema"
  );
}

/** The crawler prefixes Reddit titles with "Reddit:"; the label already says so. */
function displayTitle(article: Article): string {
  return article.title.replace(/^reddit:\s*/i, "");
}

/** "Reddit Post Signals (codex)" and "Reddit: VSCode" both read as "Reddit r/…". */
function sourceName(article: Article): string {
  if (sourceBucket(article.source) !== "reddit") return article.source;
  const community =
    article.source.match(/\(([^)]+)\)/)?.[1] ??
    article.source.match(/^reddit:\s*(?:r\/)?(\S+)/i)?.[1];
  return community ? `Reddit r/${community}` : article.source;
}

function sentence(value: string): string {
  const clean = value.trim().replace(/\s+/g, " ");
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function headlineText(headline: string): string {
  return sentence(headline).replace(/\.$/, "");
}

function sourceLabel(article: Article): string {
  const name = sourceName(article);
  if (isPrimarySource(article)) return `${name} · fonte primária`;
  if (isCommunitySignal(article)) return `${name} · sinal da comunidade`;
  return name;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// A period after these is not a sentence end: "Mr. Meeseeks" once cut the
// summary line at "Mr.".
const SENTENCE_BREAK =
  /(?<!\b(?:Mr|Mrs|Ms|Dr|Dra|Sr|Sra|Prof|vs|etc|ex|Inc|Ltd|Jr|St|approx|aprox)\.)(?<=[.!?])\s+/;

/** First sentence of the agenda fact, bounded so the summary stays scannable. */
export function leadSentence(text: string, max = 180): string {
  const first = text.trim().split(SENTENCE_BREAK)[0] ?? "";
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
      `*[Fonte: ${displayTitle(article)}](${article.url}) · ${sourceLabel(article)}*`,
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
