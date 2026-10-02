import axios from "axios";
import { db } from "../knowledge/store.js";
import type { Article } from "../knowledge/store.js";
import { ask } from "../utils/ai.js";
import { localDayIso } from "../utils/date.js";
import { log } from "../utils/logger.js";
import { UNTRUSTED_MATERIAL_RULE } from "./prompt-guards.js";
import { citedUrls, renderReading } from "./techlead.js";
import type { GeneratedArticle } from "./types.js";

/**
 * Weekly lesson on AI-assisted development: turns the week's Claude Code,
 * VS Code and OpenCode release notes into practices a developer can apply.
 * Candidates come from sources the crawler already stores; the model only
 * teaches, and anything it cites or types that is not in the material is
 * discarded.
 */

export const DEV_TIPS_WINDOW_DAYS = 7;
export const DEV_TIPS_MAX_ITEMS = 6;
const MATERIAL_CHARS = 1000;
const CLAUDE_CODE = /claude[ -]?code/i;
const PRERELEASE =
  /-(rc|alpha|beta)\.?\d*\b|\b(nightly|canary|preview|insiders)\b/i;
const REQUIRED_LABELS = ["Novidade", "Como usar", "Boa prática"];
// Reddit is a community signal, not a source to teach from.
const COMMUNITY = /^reddit/i;
// Inline code that looks like a slash command or a CLI flag.
const CODE_SPAN = /`([^`\n]+)`/g;
const COMMAND_TOKEN = /(?:^|\s)(\/[a-z][\w-]*|--[a-z][\w-]*)/gi;
const VSCODE_UPDATE_URL =
  /^https:\/\/code\.visualstudio\.com\/updates\/(v\d+_\d+)$/;
const VSCODE_NOTES =
  "https://raw.githubusercontent.com/microsoft/vscode-docs/main/release-notes";

interface Tool {
  cap: number;
  match: (article: Article) => boolean;
  /** Reader-facing name of the source link. */
  label: (article: Article) => string;
}

const TOOLS: Tool[] = [
  {
    cap: 4,
    match: (a) =>
      a.source === "Claude Code Releases" ||
      (!COMMUNITY.test(a.source) &&
        CLAUDE_CODE.test(`${a.title} ${a.summary}`)),
    label: (a) =>
      a.source === "Claude Code Releases" ? `Claude Code ${a.title}` : a.title,
  },
  {
    cap: 3,
    // The feed also carries blog posts, which have no body to teach from.
    match: (a) =>
      a.source === "VSCode Updates" && VSCODE_UPDATE_URL.test(a.url),
    label: (a) => a.title,
  },
  {
    cap: 3,
    match: (a) => a.source === "OpenCode Releases",
    label: (a) => `OpenCode ${a.title}`,
  },
];

/** Newest stable items per tool, interleaved so no tool crowds out the others. */
export function devTipCandidates(articles: Article[]): Article[] {
  const perTool: Article[][] = TOOLS.map(() => []);
  const seen = new Set<string>();
  const newestFirst = [...articles].sort((left, right) =>
    right.crawled_at.localeCompare(left.crawled_at),
  );
  for (const article of newestFirst) {
    if (PRERELEASE.test(article.title) || seen.has(article.url)) continue;
    const index = TOOLS.findIndex((tool) => tool.match(article));
    if (index < 0 || perTool[index].length >= TOOLS[index].cap) continue;
    seen.add(article.url);
    perTool[index].push(article);
  }
  const rounds = Math.max(...TOOLS.map((tool) => tool.cap));
  const interleaved: Article[] = [];
  for (let round = 0; round < rounds; round++) {
    for (const list of perTool) if (list[round]) interleaved.push(list[round]);
  }
  return interleaved;
}

function sourceLabel(article: Article): string {
  return (TOOLS.find((tool) => tool.match(article)) ?? TOOLS[0]).label(article);
}

/** Highlights of an official VS Code release note as plain text; the body when a note has none. */
export function vscodeHighlights(markdown: string): string {
  const block =
    markdown.match(
      /<!-- RELEASE_HIGHLIGHTS_START -->([\s\S]*?)<!-- RELEASE_HIGHLIGHTS_END -->/,
    )?.[1] ??
    markdown
      .replace(/^---[\s\S]*?---/, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/^# .*$/m, "");
  return block
    .replace(/^## Release highlights$/m, "")
    .replace(/^#{1,3} /gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\*\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The update feed carries no body; the release notes live in vscode-docs. */
export async function withReleaseNotes(article: Article): Promise<Article> {
  const version = VSCODE_UPDATE_URL.exec(article.url)?.[1];
  if (article.source !== "VSCode Updates" || !version) return article;
  try {
    const { data } = await axios.get<string>(`${VSCODE_NOTES}/${version}.md`, {
      timeout: 15_000,
      responseType: "text",
    });
    const highlights = vscodeHighlights(data);
    return highlights ? { ...article, summary: highlights } : article;
  } catch (err) {
    log.warn(
      `VS Code notes unavailable for ${version}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return article;
  }
}

function material(article: Article): string {
  return `- ${sourceLabel(article)} | ${article.url}\n  ${article.summary.replace(/\s+/g, " ").slice(0, MATERIAL_CHARS)}`;
}

const DEV_TIPS_SYSTEM_PROMPT = [
  "Você ensina boas práticas de desenvolvimento assistido por IA a partir das novidades da semana",
  "do Claude Code, do Visual Studio Code e do OpenCode.",
  `Escolha no máximo ${DEV_TIPS_MAX_ITEMS} novidades do material que mudam como o dev trabalha`,
  "(comandos, workflows, hooks, subagents, skills, MCP, permissões, contexto, agentes) e ensine cada uma,",
  "cobrindo mais de uma ferramenta quando o material permitir. Comece o título de cada item com a ferramenta.",
  "Responda em pt-BR com acentuação correta, sem introdução nem conclusão. Para cada item, exatamente:",
  "'### <ferramenta>: <título curto>', '**Novidade:** <fato concreto do material>',",
  "'**Como usar:** <passos práticos>', '**Boa prática:** <quando usar e o que evitar>',",
  "'**Exemplo:** <comando ou trecho em `código inline`>' (opcional), 'Fonte: <url exata do material>'.",
  "Use apenas URLs, comandos (/comando) e flags (--flag) que aparecem no material. Não invente versões nem recursos.",
  UNTRUSTED_MATERIAL_RULE,
].join(" ");

function ungroundedCommand(markdown: string, grounding: string): boolean {
  const known = grounding.toLowerCase();
  for (const span of markdown.matchAll(CODE_SPAN)) {
    for (const token of span[1].matchAll(COMMAND_TOKEN)) {
      if (!known.includes(token[1].toLowerCase())) return true;
    }
  }
  return false;
}

/** Null when the tips break the contract and must not be published. */
export function validateTips(
  markdown: string,
  candidates: Article[],
): string | null {
  const items = markdown.match(/^### /gm)?.length ?? 0;
  if (items === 0 || items > DEV_TIPS_MAX_ITEMS) return null;
  for (const label of REQUIRED_LABELS) {
    if (markdown.split(`**${label}:**`).length - 1 !== items) return null;
  }
  const pool = new Set(candidates.map((article) => article.url));
  const urls = citedUrls(markdown);
  if (urls.length === 0 || urls.some((url) => !pool.has(url))) return null;
  if (ungroundedCommand(markdown, candidates.map(material).join("\n"))) {
    return null;
  }
  return markdown.trim();
}

export function fallbackTips(candidates: Article[]): string {
  return candidates
    .slice(0, DEV_TIPS_MAX_ITEMS)
    .map((article) =>
      [
        `### ${sourceLabel(article)}`,
        `**Novidade:** ${article.summary.replace(/\s+/g, " ").slice(0, 200) || "ver fonte"}`,
        `**Como usar:** seleção automática sem síntese (${article.source}); leia a fonte`,
        "**Boa prática:** teste em um branch descartável antes de adotar",
        `Fonte: ${article.url}`,
      ].join("\n"),
    )
    .join("\n\n");
}

/** Replaces the bare host of each source link with the tool and version. */
export function labelSources(rendered: string, candidates: Article[]): string {
  const labels = new Map(
    candidates.map((article) => [article.url, sourceLabel(article)]),
  );
  return rendered.replace(
    /^Fonte: \[[^\]]+\]\((https?:\/\/[^)]+)\)$/gm,
    (line, url: string) => {
      const label = labels.get(url);
      return label ? `Fonte: [${label}](${url})` : line;
    },
  );
}

export function devTipsTitle(day: string): string {
  const [year, month, dayOfMonth] = day.split("-");
  return `Código com IA na Prática — ${dayOfMonth}/${month}/${year}`;
}

export interface DevTipsDeps {
  load: () => Article[];
  ask: typeof ask;
  enrich: (article: Article) => Promise<Article>;
}

const defaultDeps: DevTipsDeps = {
  load: () => db.getArticlesSince(DEV_TIPS_WINDOW_DAYS),
  ask,
  enrich: withReleaseNotes,
};

export async function generateDevTips(
  now = new Date(),
  deps: DevTipsDeps = defaultDeps,
): Promise<GeneratedArticle> {
  const articles = deps.load();
  const selectedCandidates = devTipCandidates(articles);
  if (selectedCandidates.length === 0) {
    throw new Error(
      `No Claude Code, VS Code or OpenCode news in the last ${DEV_TIPS_WINDOW_DAYS} days`,
    );
  }
  const candidates = await Promise.all(selectedCandidates.map(deps.enrich));

  let tips: string | null = null;
  try {
    tips = validateTips(
      await deps.ask(
        `Material dos últimos ${DEV_TIPS_WINDOW_DAYS} dias:\n\n${candidates.map(material).join("\n")}`,
        DEV_TIPS_SYSTEM_PROMPT,
        { maxOutputTokens: 2500 },
      ),
      candidates,
    );
    if (!tips) log.warn("Dev tips broke the contract; using ranking");
  } catch (err) {
    log.warn(
      `Dev tips fell back to ranking: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const content = tips ?? fallbackTips(candidates);
  const cited = new Set(citedUrls(content));
  const selected = candidates.filter((article) => cited.has(article.url));

  const day = localDayIso(now);
  return {
    title: devTipsTitle(day),
    slug: `devtips-${day}`,
    content: `${labelSources(renderReading(content), candidates)}\n\n_${candidates.length} novidades candidatas nos últimos ${DEV_TIPS_WINDOW_DAYS} dias._`,
    summary: `${selected.length} novidades de Claude Code, VS Code e OpenCode transformadas em prática.`,
    tags: ["claude-code", "vscode", "opencode", "boas-praticas", "dicas"],
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
      buckets: { devtips: candidates.length },
      primarySources: selected.length,
    },
    reportPeriod: "devtips",
  };
}
