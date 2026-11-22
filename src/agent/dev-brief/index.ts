import axios from "axios";
import { config } from "../../config.js";
import { CLAUDE_NOTES_SOURCE } from "../../crawler/claude-notes.js";
import { FEED_BODY_MAX } from "../../crawler/feed-items.js";
import { MCP_REGISTRY_SOURCE } from "../../crawler/mcp-registry.js";
import {
  type CatalogModel,
  fetchModelCatalog,
  type ModelCard,
  modelCard,
  recentMajorModels,
} from "../../crawler/model-launches.js";
import {
  installCommand,
  type RepoVelocity,
  rankVelocity,
} from "../../crawler/repo-velocity.js";
import {
  feedbackStore,
  sourceWeights,
} from "../../knowledge/feedback-store.js";
import { repoStars } from "../../knowledge/repo-stars.js";
import type { Article } from "../../knowledge/store.js";
import { db } from "../../knowledge/store.js";
import { addDays, localDayIso } from "../../utils/date.js";
import { HTTP_LIMITS } from "../../utils/http-limits.js";
import { log } from "../../utils/logger.js";
import { plain } from "../skill-week/render.js";
import type { GeneratedArticle } from "../types.js";
import {
  type BriefItem,
  pickTop,
  type RankContext,
  type Section,
  sortSection,
} from "./rank.js";
import {
  clip,
  modelLine,
  renderBriefMessage,
  renderBriefPage,
} from "./render.js";

const CLAUDE_SOURCES = new Set([
  CLAUDE_NOTES_SOURCE,
  "Claude Code Releases",
  "Anthropic News",
  "Anthropic Engineering",
  "Anthropic Python SDK Releases",
  "Anthropic TypeScript SDK Releases",
  "Claude Agent SDK Releases",
]);
const TOOL_SOURCES = new Set([MCP_REGISTRY_SOURCE, "GitHub Agent Skills"]);
const BREAKING_HORIZON_DAYS = 60;
const REMOVAL_TAG = /"removal:(\d{4}-\d{2}-\d{2})"/;
const PER_SECTION = 6;

export interface DevBriefDeps {
  recent: () => Article[];
  breaking: () => Article[];
  catalog: () => Promise<CatalogModel[]>;
  velocity: (today: string) => RepoVelocity[];
  readme: (repo: string) => Promise<string>;
  rank: () => RankContext;
}

const defaultDeps: DevBriefDeps = {
  recent: () => db.getArticlesSince(1, 3000),
  breaking: () =>
    db.getArticlesSince(240, 1000, { source: CLAUDE_NOTES_SOURCE }),
  catalog: fetchModelCatalog,
  velocity: (today) => rankVelocity(repoStars.since(addDays(today, -8)), today),
  readme: async (repo) => {
    const { data } = await axios.get<string>(
      `https://raw.githubusercontent.com/${repo}/HEAD/README.md`,
      { ...HTTP_LIMITS, timeout: 10_000, responseType: "text" },
    );
    return typeof data === "string" ? data.slice(0, FEED_BODY_MAX) : "";
  },
  rank: () => ({
    stack: config.readerStack,
    weights: sourceWeights(feedbackStore.tallies()),
  }),
};

const NOTE_DAY = /#(\d{4}-\d{2}-\d{2})-[0-9a-f]{10}$/;

/** Newer first: the note's own day, else when it was crawled. */
function noteTime(article: Article): number {
  const match = article.url.match(NOTE_DAY);
  if (match) return Date.parse(match[1]);
  const crawled = Date.parse(`${article.crawled_at.replace(" ", "T")}Z`);
  return Number.isNaN(crawled) ? 0 : crawled;
}

function fromArticle(
  section: Section,
  article: Article,
  strength = noteTime(article),
): BriefItem {
  const command = article.body?.match(/```(?:bash|sh)?\n([^\n]{1,140})\n```/);
  return {
    section,
    title: article.title.replace(/^Claude API \d{4}-\d{2}-\d{2}: /, ""),
    url: article.url,
    line: clip(article.summary, 300),
    source: article.source,
    command: command?.[1] ?? null,
    strength,
  };
}

export function breakingItems(articles: Article[], today: string): BriefItem[] {
  const horizon = addDays(today, BREAKING_HORIZON_DAYS);
  return articles
    .map((article) => ({ article, date: article.tags.match(REMOVAL_TAG)?.[1] }))
    .filter(
      (row): row is { article: Article; date: string } =>
        !!row.date && row.date >= today && row.date <= horizon,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ article, date }) => {
      const [y, m, d] = date.split("-");
      const item = fromArticle("breaking", article, -Date.parse(date));
      return { ...item, title: `Até ${d}/${m}/${y}: ${item.title}` };
    });
}

async function repoItems(
  repos: RepoVelocity[],
  readme: DevBriefDeps["readme"],
): Promise<BriefItem[]> {
  const items: BriefItem[] = [];
  for (const repo of repos) {
    const text = await readme(repo.repo).catch(() => "");
    items.push({
      section: "repos",
      title: `${repo.repo}${repo.isNew ? " (novo)" : ""}`,
      url: repo.url,
      line: `${repo.perDay} estrelas/dia · ${repo.stars} no total. ${repo.description}`,
      source: "GitHub Trending",
      command: installCommand(text),
      strength: repo.perDay,
    });
  }
  return items;
}

export interface DevBrief {
  article: GeneratedArticle;
  top: BriefItem[];
  message: string;
}

export async function generateDevBrief(
  now = new Date(),
  deps: DevBriefDeps = defaultDeps,
): Promise<DevBrief> {
  const today = localDayIso(now);
  const ctx = deps.rank();
  const recent = deps.recent();
  let cards: ModelCard[] = [];
  try {
    cards = recentMajorModels(await deps.catalog(), now, 2).map(modelCard);
  } catch (err) {
    // Optional section: a catalog outage must not cost the brief.
    log.warn(`Dev brief models skipped: ${(err as Error).message}`);
  }
  const raw = new Map<Section, BriefItem[]>([
    ["breaking", breakingItems(deps.breaking(), today)],
    [
      "claude",
      recent
        .filter(
          (a) => CLAUDE_SOURCES.has(a.source) && !/"removal:/.test(a.tags),
        )
        .map((a) => fromArticle("claude", a)),
    ],
    [
      "models",
      cards.map((card) => ({
        section: "models" as const,
        title: card.name,
        url: card.url,
        line: modelLine(card),
        source: "OpenRouter: New Models",
        strength: card.launchedAt ?? 0,
      })),
    ],
    ["repos", await repoItems(deps.velocity(today).slice(0, 5), deps.readme)],
    [
      "tools",
      recent
        .filter((a) => TOOL_SOURCES.has(a.source))
        .map((a) => fromArticle("tools", a, a.engagement_score)),
    ],
  ]);
  const sections = new Map<Section, BriefItem[]>();
  for (const [section, items] of raw) {
    // Breaking stays in date order: the nearest removal is the most urgent.
    const sorted = section === "breaking" ? items : sortSection(items, ctx);
    sections.set(section, sorted.slice(0, PER_SECTION));
  }
  const top = pickTop(sections);
  if (top.length === 0) throw new Error("Nothing new for the dev brief");

  const [y, m, d] = today.split("-");
  const title = `Radar dev ${d}/${m}/${y}`;
  const listed = [...sections.values()].flat();
  return {
    top,
    message: renderBriefMessage(title, top),
    article: {
      title,
      slug: `devbrief-${today}`,
      content: renderBriefPage(sections, cards),
      summary: `${top.length} destaques: ${top.map((item) => plain(item.title, 40)).join("; ")}.`,
      tags: ["claude", "modelos", "repos", "ferramentas", "radar-dev"],
      date: today,
      sources: listed.map((item) => item.url),
      evidence: listed.map((item) => ({
        sourceUrl: item.url,
        sourceTitle: item.title,
        excerpt: item.line.slice(0, 400),
      })),
      editorialMetrics: {
        considered: recent.length,
        selected: listed.length,
        rejected: 0,
        buckets: Object.fromEntries(
          [...sections].map(([section, items]) => [section, items.length]),
        ),
        primarySources: listed.length,
      },
      reportPeriod: "devbrief",
    },
  };
}
