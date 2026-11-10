import { isSafeExternalUrl } from "@juninmd/digest-kit/core";
import axios from "axios";
import Parser from "rss-parser";
import { normalizeTitle } from "../agent/curation.js";
import { getSearchKeywords } from "../agent/improver.js";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { mapLimit } from "../utils/concurrency.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
import { log } from "../utils/logger.js";
import { AGENT_SOURCES } from "./agent-sources.js";
import { closeSharedBrowser, withStealthPage } from "./browser.js";
import {
  type FeedItem,
  feedItemSummary,
  isEmptyRelease,
  isPrereleaseTitle,
  selectFeedItems,
  summarizeSourceContent,
} from "./feed-items.js";
import { HF_PAPERS_SOURCE, crawlHuggingFacePapers } from "./hf-papers.js";
import { crawlArtificialAnalysisIntelligence } from "./intelligence.js";
import {
  HF_TRENDING_SOURCE,
  OPENROUTER_SOURCE,
  crawlModelLaunches,
  crawlTrendingModels,
} from "./model-launches.js";
import {
  REDDIT_FEED_MIN_INTERVAL_MINUTES,
  REDDIT_USER_AGENT,
  RedditRateLimitError,
  crawlRedditCommunitySignals,
  isRedditSource,
  redditFeedAttemptKey,
  redditFeedDue,
  redditGet,
} from "./reddit.js";
import { DEFAULT_SOURCES, type FeedSource } from "./sources.js";
import { TECHLEAD_SOURCES } from "./techlead-sources.js";

export { summarizeSourceContent, withStealthPage };

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  },
});

/**
 * "Crawler failed for Google Research: " nao diz nada. Um erro sem mensagem
 * ainda carrega status HTTP, codigo e tipo; e o que permite agir depois.
 */
export function hostnameOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!isSafeExternalUrl(url)) {
      return null;
    }
    return parsed.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function isHost(url: string, domain: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  const d = domain.toLowerCase();
  const domains =
    d === "x.com" || d === "twitter.com" ? ["x.com", "twitter.com"] : [d];
  return domains.some(
    (target) => host === target || host.endsWith(`.${target}`),
  );
}

export function describeCrawlerError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const parts = [
      err.response?.status ? `HTTP ${err.response.status}` : null,
      err.code ?? null,
      err.message || null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "erro HTTP sem detalhe";
  }
  if (err instanceof Error) {
    return err.message || err.name || "Error sem mensagem";
  }
  const text = String(err).trim();
  return text === "" ? "falha sem detalhe" : text;
}

function isV2exAiRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return V2EX_AI_KEYWORDS.some((keyword) => lower.includes(keyword));
}

const V2EX_AI_KEYWORDS = [
  "ai",
  "agent",
  "claude",
  "codex",
  "copilot",
  "gpt",
  "llm",
  "mimo",
  "模型",
  "智能体",
  "deepseek",
  "gemini",
  "opus",
  "qwen",
  "cursor",
  "litellm",
  "vibecoding",
  "vibe coding",
  "向量",
  "脱敏",
  "屎山",
];

const EXTRA_CRAWLER_CONCURRENCY = 3;

const CIRCUIT_OPEN_THRESHOLD = 3;
const CIRCUIT_SKIP_CYCLES = 5;
function circuitAllow(name: string): boolean {
  const health = db.getSourceHealth(name);
  if ((health?.skip_remaining ?? 0) > 0) {
    db.setSourceHealth(
      name,
      health?.consecutive_failures ?? 0,
      (health?.skip_remaining ?? 0) - 1,
    );
    return false;
  }
  return true;
}

function circuitSuccess(name: string) {
  db.setSourceHealth(name, 0, 0);
}

function circuitFailure(name: string) {
  const failures = (db.getSourceHealth(name)?.consecutive_failures ?? 0) + 1;
  if (failures >= CIRCUIT_OPEN_THRESHOLD) {
    db.setSourceHealth(name, 0, CIRCUIT_SKIP_CYCLES);
    log.warn(
      `Circuit breaker opened for "${name}" after ${failures} consecutive failures — skipping next ${CIRCUIT_SKIP_CYCLES} cycles`,
    );
    return;
  }
  db.setSourceHealth(name, failures, 0);
}

function getDynamicSources(): FeedSource[] {
  try {
    const raw = db.getState("extra_sources");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedSource[];
    return parsed.filter(
      (source) =>
        source &&
        typeof source.name === "string" &&
        Array.isArray(source.tags) &&
        isSafeExternalUrl(source.url),
    );
  } catch {
    return [];
  }
}

const GITHUB_TRENDING_AI_KEYWORDS = [
  // IA/LLM core
  "ai",
  "agent",
  "agents",
  "llm",
  "model",
  "ml",
  "chat",
  "gpt",
  "claude",
  "codex",
  // Ferramentas e plataformas
  "anthropic",
  "openai",
  "huggingface",
  "deepseek",
  "gemini",
  "qwen",
  "mistral",
  // Frameworks e bibliotecas
  "langchain",
  "crewai",
  "autogen",
  "vllm",
  "ollama",
  "litellm",
  "llamaindex",
  // Técnicas específicas
  "rag",
  "retrieval",
  "embedding",
  "vector",
  "prompt",
  "fine-tun",
  "training",
  "inference",
  // Modelos e arquitetura
  "transformer",
  "diffusion",
  "neural",
  "attention",
  "convolution",
  // Casos de uso
  "chatbot",
  "assistant",
  "copilot",
  "nlp",
  "computer-vision",
  "text-to-speech",
  "speech-to-text",
  "image-generation",
  // Ferramentas de dev
  "cursor",
  "codiumai",
  "comet",
  "wandb",
  // Infraestrutura
  "mcp",
  "tokenizer",
  "quantization",
];

const GITHUB_TRENDING_LANGUAGES = [
  "Python",
  "TypeScript",
  "JavaScript",
  "Go",
  "Rust",
  "Java",
];

async function crawlGitHubTrending(): Promise<number> {
  let newCount = 0;

  await withStealthPage(async (page) => {
    const queries: Array<{ label: string; url: string }> = [
      {
        label: "daily",
        url: "https://github.com/trending?since=daily",
      },
      {
        label: "weekly",
        url: "https://github.com/trending?since=weekly",
      },
    ];

    for (const lang of GITHUB_TRENDING_LANGUAGES) {
      queries.push({
        label: `daily-${lang.toLowerCase()}`,
        url: `https://github.com/trending/${lang.toLowerCase()}?since=daily`,
      });
    }

    for (const { label, url } of queries) {
      try {
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        const repos = await page.evaluate(() => {
          const articles = document.querySelectorAll("article.Box-row");
          return Array.from(articles)
            .slice(0, 50)
            .map((article) => {
              const link = article.querySelector("h2 a");
              const desc = article.querySelector("p");
              const starsEl = article.querySelector('a[href$="/stargazers"]');
              const langEl = article.querySelector(
                '[itemprop="programmingLanguage"]',
              );
              return {
                name: link?.textContent?.replace(/\s+/g, " ").trim() ?? "",
                url: link
                  ? `https://github.com${link.getAttribute("href")}`
                  : "",
                description: desc?.textContent?.trim() ?? "",
                stars: starsEl?.textContent?.trim() ?? "",
                language: langEl?.textContent?.trim() ?? "",
              };
            });
        });

        const day = todayIso();
        for (const repo of repos) {
          if (!repo.url || !repo.name) continue;
          const signalUrl = trendingSignalUrl(repo.url, label, day);
          if (db.urlExists(signalUrl)) continue;

          const combined = `${repo.name} ${repo.description}`.toLowerCase();
          const isAiRelevant = GITHUB_TRENDING_AI_KEYWORDS.some((kw) =>
            combined.includes(kw),
          );
          if (!isAiRelevant) continue;

          const summary = [
            repo.description,
            repo.stars ? `⭐ ${repo.stars}` : "",
            repo.language ? `Lang: ${repo.language}` : "",
          ]
            .filter(Boolean)
            .join(" | ")
            .slice(0, 500);

          const starCount = parseGitHubStarCount(repo.stars);
          db.saveArticle({
            title: repo.name,
            source: `GitHub Trending (${label})`,
            url: signalUrl,
            summary,
            tags: JSON.stringify([
              "github",
              "trending",
              "ai",
              label,
              repo.language?.toLowerCase() ?? "unknown",
            ]),
            engagement_score: starCount,
          });
          newCount++;
        }
      } catch (err) {
        log.debug(
          `GitHub Trending (${label}) skipped: ${(err as Error).message}`,
        );
      }
    }

    log.info(`Crawled GitHub Trending, ${newCount} new AI repos`);
  });

  return newCount;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function trendingSignalUrl(
  repoUrl: string,
  label: string,
  day: string,
): string {
  return `${repoUrl.split("#")[0]}#trending-${label}-${day}`;
}

/**
 * A trending/search/article mirror page on x.com is not a citable primary
 * source; only a real tweet permalink (x.com/<handle>/status/<id>) carries
 * stable, quotable content.
 */
export function isCitableXUrl(url: string): boolean {
  return /x\.com\/[^/]+\/status\/\d+/i.test(url);
}

export function parseGitHubStarCount(value: string): number {
  const normalized = value.trim().toLowerCase().replace(/,/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([km])?$/);
  if (!match) return 0;
  const multiplier =
    match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

export function hackerNewsEngagement(
  points: number | null | undefined,
  comments: number | null | undefined,
): number {
  return (points ?? 0) + (comments ?? 0) * 2;
}

async function fetchWithPlaywright(url: string): Promise<string> {
  log.info(`Using Playwright stealth to fetch: ${url}`);
  return withStealthPage(
    async (page) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);

      const content = await page.evaluate(() => {
        const pre = document.querySelector("pre");
        if (pre) return pre.innerText;

        const webkitXml = document.querySelector(
          "#webkit-xml-viewer-source-xml",
        );
        if (webkitXml) return webkitXml.innerHTML;

        return document.documentElement.outerHTML;
      });

      const xmlMatch = content.match(
        /<\?xml[^>]*>[\s\S]*|<!doctype[^>]*>[\s\S]*|<feed[^>]*>[\s\S]*<\/feed>|<rss[^>]*>[\s\S]*<\/rss>/i,
      );
      const finalXml = xmlMatch ? xmlMatch[0] : content;
      log.info(
        `Fetched ${finalXml.length} bytes. Start: ${finalXml.slice(0, 100).replace(/\n/g, " ")}`,
      );
      return finalXml;
    },
    {
      extraHTTPHeaders: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    },
  );
}

export function isHackerNewsRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  const words = lower.split(/[^a-z0-9+.]+/);
  return HACKER_NEWS_KEYWORDS.some((keyword) => {
    if (keyword.includes(" ")) return lower.includes(keyword);
    return keyword.length <= 3
      ? words.includes(keyword)
      : words.some((word) => word.startsWith(keyword));
  });
}

const HACKER_NEWS_MIN_POINTS = 20;

const HACKER_NEWS_KEYWORDS = [
  "ai",
  "llm",
  "gpt",
  "claude",
  "agent",
  "copilot",
  "codex",
  "model",
  "openai",
  "anthropic",
  "gemini",
  "qwen",
  "deepseek",
  "inference",
  "prompt",
  "rag",
  "transformer",
  "machine learning",
  "deep learning",
  "neural",
];

async function crawlHackerNewsAlgolia(): Promise<number> {
  let newCount = 0;
  const queries = [
    {
      tag: "front-page",
      url: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50",
      filter: true,
    },
    {
      tag: "ai",
      url: `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
        "AI OR LLM OR GPT OR Claude OR agent",
      )}&tags=story&hitsPerPage=30&numericFilters=points>${HACKER_NEWS_MIN_POINTS}`,
      filter: false,
    },
  ];

  for (const { tag, url, filter } of queries) {
    try {
      const response = await axios.get(url, { ...HTTP_LIMITS, timeout: 10000 });
      const hits = response.data?.hits ?? [];

      for (const hit of hits) {
        const storyUrl =
          hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (!hit.title || db.urlExists(storyUrl)) continue;
        if (filter && !isHackerNewsRelevant(hit.title)) continue;
        if ((hit.points ?? 0) < HACKER_NEWS_MIN_POINTS) continue;

        const points = hit.points ?? 0;
        const numComments = hit.num_comments ?? 0;
        const summary = [
          hit.title,
          points ? `⬆ ${points} points` : "",
          numComments ? `💬 ${numComments} comments` : "",
          hit.author ? `by ${hit.author}` : "",
        ]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 500);

        db.saveArticle({
          title: hit.title,
          source: "Hacker News",
          url: storyUrl,
          summary,
          tags: JSON.stringify(["hackernews", tag, "ai"]),
          engagement_score: hackerNewsEngagement(points, numComments),
        });
        newCount++;
      }
    } catch (err) {
      log.warn(
        `Hacker News Algolia (${tag}) failed: ${(err as Error).message}`,
      );
    }
  }

  log.info(`Crawled Hacker News Algolia, ${newCount} new stories`);
  return newCount;
}

interface TabNewsItem {
  title?: string;
  slug?: string;
  status?: string;
  owner_username?: string;
  tabcoins?: number;
  children_deep_count?: number;
  body?: string;
}

async function crawlTabNews(): Promise<number> {
  let newCount = 0;
  try {
    const url =
      "https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=30";
    const response = await axios.get(url, { ...HTTP_LIMITS, timeout: 15000 });
    const contents = ((response.data ?? []) as TabNewsItem[])
      .filter((item): item is TabNewsItem & { title: string; slug: string } =>
        Boolean(item.title && item.slug && item.status === "published"),
      )
      .sort(
        (left, right) =>
          (right.tabcoins ?? 0) +
          (right.children_deep_count ?? 0) * 2 -
          ((left.tabcoins ?? 0) + (left.children_deep_count ?? 0) * 2),
      )
      .slice(0, 20);

    const missingBodies = contents.filter((item) => !item.body);
    const fetchedBodies = await mapLimit(missingBodies, 5, async (item) => {
      try {
        const detail = await axios.get(
          `https://www.tabnews.com.br/api/v1/contents/${item.owner_username}/${item.slug}`,
          { ...HTTP_LIMITS, timeout: 8000 },
        );
        return { slug: item.slug, body: detail.data?.body ?? "" };
      } catch (err) {
        log.debug(
          `TabNews detail skipped for ${item.slug}: ${(err as Error).message}`,
        );
        return { slug: item.slug, body: "" };
      }
    });
    const bodyBySlug = new Map(
      fetchedBodies.map((entry) => [entry.slug, entry.body]),
    );

    for (const item of contents) {
      const postUrl = `https://www.tabnews.com.br/${item.owner_username}/${item.slug}`;
      if (db.urlExists(postUrl)) continue;

      const tabcoins = item.tabcoins ?? 0;
      const comments = item.children_deep_count ?? 0;
      const body = item.body ?? bodyBySlug.get(item.slug) ?? "";
      const summary = summarizeSourceContent(body);
      if (summary.length < 80) continue;

      db.saveArticle({
        title: item.title,
        source: "TabNews",
        url: postUrl,
        summary,
        tags: JSON.stringify(["tabnews", "br", "developer"]),
        engagement_score: tabcoins + comments * 2,
      });
      newCount++;
    }
  } catch (err) {
    log.warn(`TabNews failed: ${(err as Error).message}`);
  }

  log.info(`Crawled TabNews, ${newCount} new posts`);
  return newCount;
}

async function crawlAiCommunityPosts(): Promise<number> {
  let newCount = 0;
  const aiTags = ["ai", "llm", "machine-learning", "agents"];

  for (const tag of aiTags) {
    try {
      const url = `https://dev.to/api/articles?tag=${tag}&top=7&per_page=25`;
      const response = await axios.get(url, { ...HTTP_LIMITS, timeout: 10000 });
      const articles = response.data ?? [];

      for (const item of articles) {
        if (!item.url || !item.title) continue;
        if (db.urlExists(item.url)) continue;

        const summary = summarizeSourceContent(item.description ?? "", 500);
        const engagement =
          (item.positive_reactions_count ?? 0) + (item.comments_count ?? 0) * 2;

        db.saveArticle({
          title: item.title,
          source: `Dev.to (${tag})`,
          url: item.url,
          summary,
          tags: JSON.stringify(["devto", "community", tag, "ai"]),
          engagement_score: engagement,
        });
        newCount++;
      }
    } catch (err) {
      log.debug(`Dev.to (${tag}) crawler: ${(err as Error).message}`);
    }
  }

  const hashnoteTags = ["artificial-intelligence", "llm", "machine-learning"];
  for (const tag of hashnoteTags) {
    try {
      const url = `https://hashnode.com/api/v1/posts?tagSlug=${tag}&limit=15`;
      const response = await axios.get(url, { ...HTTP_LIMITS, timeout: 10000 });
      const posts = response.data?.posts ?? [];

      for (const item of posts) {
        if (!item.url || !item.title) continue;
        if (db.urlExists(item.url)) continue;

        const summary = summarizeSourceContent(
          item.subtitle ?? item.brief ?? "",
          500,
        );
        const engagement =
          (item.reactionCount ?? 0) + (item.responseCount ?? 0) * 2;

        db.saveArticle({
          title: item.title,
          source: `Hashnode (${tag})`,
          url: item.url,
          summary,
          tags: JSON.stringify(["hashnode", "community", tag, "ai"]),
          engagement_score: engagement,
        });
        newCount++;
      }
    } catch (err) {
      log.debug(`Hashnode (${tag}) crawler: ${(err as Error).message}`);
    }
  }

  log.info(`Crawled AI community posts, ${newCount} new articles`);
  return newCount;
}

async function crawlHtmlSource(source: FeedSource): Promise<number> {
  if (!source.html) return 0;
  const { hrefPrefix, baseUrl } = source.html;

  let newCount = 0;
  try {
    await withStealthPage(async (page) => {
      await page.goto(source.url, { waitUntil: "networkidle", timeout: 30000 });

      const articles = await page.evaluate(
        ({ hrefPrefix, baseUrl, listUrl }) => {
          const links = document.querySelectorAll(`a[href^="${hrefPrefix}"]`);
          return Array.from(links)
            .map((a) => {
              const href = a.getAttribute("href") ?? "";
              const titleEl = a.querySelector('h2, h3, h4, [class*="title"]');
              const title = titleEl
                ? titleEl.textContent?.trim()
                : a.textContent?.trim();
              const card = a.closest('[class*="card"]') ?? a.parentElement ?? a;
              const descEl = a.querySelector("p") ?? card.querySelector("p");
              const summary = descEl ? descEl.textContent?.trim() : "";
              return {
                title: title ?? "",
                url: href.startsWith("http") ? href : `${baseUrl}${href}`,
                summary: summary ?? "",
              };
            })
            .filter((item) => item.title && item.url && item.url !== listUrl);
        },
        { hrefPrefix, baseUrl, listUrl: source.url },
      );

      if (articles.length === 0) {
        log.warn(
          `HTML source "${source.name}" matched 0 items — markup may have changed (selector a[href^="${hrefPrefix}"]).`,
        );
      }

      const { excludePrefix } = source.html ?? {};
      const listed = excludePrefix
        ? articles.filter(
            (article) => !article.url.startsWith(`${baseUrl}${excludePrefix}`),
          )
        : articles;
      for (const article of listed.slice(0, 10)) {
        if (!article.url || !article.title) continue;
        if (db.urlExists(article.url)) continue;

        db.saveArticle({
          title: article.title,
          source: source.name,
          url: article.url,
          summary: article.summary,
          tags: JSON.stringify(source.tags),
          engagement_score: 0,
        });
        newCount++;
      }
    });
  } catch (err) {
    log.warn(`HTML crawler "${source.name}" failed: ${(err as Error).message}`);
  }
  return newCount;
}

export interface CrawlReport {
  totalSaved: number;
  sources: Record<string, { saved: number; failed: boolean }>;
  failedSources: string[];
}

export async function crawlAll(): Promise<CrawlReport> {
  try {
    return await crawlAllInner();
  } finally {
    await closeSharedBrowser();
  }
}

async function crawlAllInner(): Promise<CrawlReport> {
  const sources = [
    ...DEFAULT_SOURCES,
    ...AGENT_SOURCES,
    ...TECHLEAD_SOURCES,
    ...getDynamicSources(),
  ].filter((s) => s?.url && s.name);
  let newCount = 0;
  let redditRateLimited = false;
  const metrics: Record<string, { saved: number; failed: boolean }> = {};
  for (const source of sources) {
    metrics[source.name] = { saved: 0, failed: false };
  }

  const crawlSource = async (source: FeedSource): Promise<void> => {
    if (redditRateLimited && isRedditSource(source)) {
      log.debug(`Reddit rate limit active: skipping "${source.name}"`);
      return;
    }
    if (!circuitAllow(source.name)) {
      log.debug(`Circuit breaker: skipping "${source.name}"`);
      return;
    }
    if (
      isRedditSource(source) &&
      !redditFeedDue(db.getState(redditFeedAttemptKey(source.name)))
    ) {
      log.debug(
        `Reddit feed "${source.name}" skipped: attempted under ${REDDIT_FEED_MIN_INTERVAL_MINUTES}min ago`,
      );
      return;
    }
    try {
      if (source.html) {
        log.info(`Scraping HTML source "${source.name}" from: ${source.url}`);
        const count = await crawlHtmlSource(source);
        newCount += count;
        metrics[source.name].saved = count;
        circuitSuccess(source.name);
        return;
      }
      let feedData: Awaited<ReturnType<typeof parser.parseURL>>;
      try {
        if (isRedditSource(source)) {
          db.setState(
            redditFeedAttemptKey(source.name),
            new Date().toISOString(),
          );
          const rawXml = await redditGet<string>(source.url, {
            headers: {
              Accept: "application/atom+xml, application/xml",
              "User-Agent": REDDIT_USER_AGENT,
            },
            timeout: 10000,
          });
          feedData = await parser.parseString(rawXml);
        } else {
          feedData = await parser.parseURL(source.url);
        }
      } catch (err) {
        if (err instanceof RedditRateLimitError && isRedditSource(source)) {
          redditRateLimited = true;
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("403") || message.includes("429")) {
          log.warn(
            `Standard fetch failed with ${message}. Attempting Playwright fallback for ${source.name}...`,
          );
          const rawXml = await fetchWithPlaywright(source.url);
          feedData = await parser.parseString(rawXml);
        } else {
          throw err;
        }
      }

      if (!feedData?.items) return;

      const newsworthy = feedData.items
        .map((item: FeedItem) => ({ ...item, summary: feedItemSummary(item) }))
        .filter(
          (item) =>
            !isEmptyRelease(item.summary) &&
            !isPrereleaseTitle(item.title ?? ""),
        );
      for (const item of selectFeedItems(newsworthy)) {
        if (!item.link || !item.title) continue;
        if (db.urlExists(item.link)) continue;
        if (source.name.startsWith("V2EX") && !isV2exAiRelevant(item.title))
          continue;
        db.saveArticle({
          title: item.title,
          source: source.name,
          url: item.link,
          summary: item.summary ?? "",
          tags: JSON.stringify(source.tags),
          engagement_score: 0,
        });
        newCount++;
        metrics[source.name].saved++;
      }
      circuitSuccess(source.name);
    } catch (err) {
      metrics[source.name].failed = true;
      circuitFailure(source.name);
      log.warn(
        `Crawler failed for ${source.name}: ${describeCrawlerError(err)}`,
      );
    }
  };

  await mapLimit(sources, 4, crawlSource);

  const keywords = getSearchKeywords();
  let googleNewsSaved = 0;
  let googleNewsFailed = 0;
  const googleNewsTitles = new Set<string>();
  await mapLimit(keywords, 4, async (keyword) => {
    try {
      const queryUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
        keyword,
      )}&hl=en-US&gl=US&ceid=US:en`;
      const feed = await parser.parseURL(queryUrl);
      for (const item of feed.items.slice(0, 5)) {
        if (!item.link || !item.title) continue;
        if (db.urlExists(item.link)) continue;
        const titleKey = normalizeTitle(item.title);
        if (googleNewsTitles.has(titleKey)) continue;
        googleNewsTitles.add(titleKey);
        db.saveArticle({
          title: item.title,
          source: `Google News (${keyword})`,
          url: item.link,
          summary: item.contentSnippet?.slice(0, 500) ?? "",
          tags: JSON.stringify(["google-news", keyword]),
          engagement_score: 0,
        });
        newCount++;
        googleNewsSaved++;
      }
    } catch (err) {
      googleNewsFailed++;
      log.warn(
        `Google News search crawler failed for '${keyword}': ${(err as Error).message}`,
      );
    }
  });
  metrics["Google News (keywords)"] = {
    saved: googleNewsSaved,
    failed: googleNewsFailed === keywords.length && keywords.length > 0,
  };

  let searxngSaved = 0;
  let searxngFailed = 0;
  await mapLimit(keywords, 3, async (keyword) => {
    try {
      const cleanKeyword = keyword.slice(0, 60).trim();
      const query = `(site:reddit.com OR site:x.com) "${cleanKeyword}"`;
      const searxngUrl = `${config.searxngUrl}/search?q=${encodeURIComponent(
        query,
      )}&format=json`;
      const response = await axios.get(searxngUrl, {
        ...HTTP_LIMITS,
        timeout: 5000,
      });
      const results = response.data?.results ?? [];
      for (const result of results.slice(0, 5)) {
        if (!result.url || !result.title) continue;
        if (hostnameOf(result.url) === null) continue;
        if (db.urlExists(result.url)) continue;
        if (isHost(result.url, "x.com") && !isCitableXUrl(result.url)) {
          continue;
        }
        const sourceName = isHost(result.url, "reddit.com")
          ? `Reddit (${cleanKeyword})`
          : isHost(result.url, "x.com")
            ? `X/Twitter (${cleanKeyword})`
            : `Web Search (${cleanKeyword})`;
        db.saveArticle({
          title: result.title,
          source: sourceName,
          url: result.url,
          summary: result.content?.slice(0, 500) ?? "",
          tags: JSON.stringify(["searxng", keyword]),
          engagement_score: 0,
        });
        newCount++;
        searxngSaved++;
      }
    } catch (err) {
      searxngFailed++;
      log.warn(
        `SearXNG failed for '${keyword.slice(0, 40)}': ${(err as Error).message}`,
      );
    }
  });
  metrics["SearXNG (keywords)"] = {
    saved: searxngSaved,
    failed: searxngFailed === keywords.length && keywords.length > 0,
  };

  const extras: Array<{ name: string; fn: () => Promise<number> }> = [
    { name: "AI Community Posts", fn: crawlAiCommunityPosts },
    {
      name: "Artificial Analysis Intelligence",
      fn: async () => {
        const result = await crawlArtificialAnalysisIntelligence();
        return result.models.length;
      },
    },
    { name: "GitHub Trending", fn: crawlGitHubTrending },
    { name: "Hacker News Algolia", fn: crawlHackerNewsAlgolia },
    { name: HF_PAPERS_SOURCE, fn: () => crawlHuggingFacePapers() },
    { name: HF_TRENDING_SOURCE, fn: () => crawlTrendingModels() },
    { name: OPENROUTER_SOURCE, fn: () => crawlModelLaunches() },
    { name: "Reddit Community Signals", fn: crawlRedditCommunitySignals },
    { name: "TabNews", fn: crawlTabNews },
  ];
  // Each extra talks to its own host, and the Reddit sweep alone may pace
  // itself for up to 20 minutes: in sequence, everything listed after it
  // waited for it. A small bound keeps the shared browser and the event loop
  // from being flooded.
  await mapLimit(extras, EXTRA_CRAWLER_CONCURRENCY, async (extra) => {
    if (!circuitAllow(extra.name)) {
      log.debug(`Circuit breaker: skipping "${extra.name}"`);
      return;
    }
    try {
      const count = await extra.fn();
      newCount += count;
      metrics[extra.name] = { saved: count, failed: false };
      circuitSuccess(extra.name);
    } catch (err) {
      metrics[extra.name] = { saved: 0, failed: true };
      circuitFailure(extra.name);
      log.warn(`${extra.name} crawler failed: ${(err as Error).message}`);
    }
  });

  const failed = Object.entries(metrics)
    .filter(([, v]) => v.failed)
    .map(([k]) => k);
  const summary = Object.entries(metrics)
    .filter(([, v]) => !v.failed && v.saved > 0)
    .map(([k, v]) => `${k}:${v.saved}`)
    .join(", ");
  log.info(
    `Crawl complete — ${newCount} new articles. Saved by source: [${summary || "none"}]${
      failed.length ? `. Failed: [${failed.join(", ")}]` : ""
    }`,
  );
  return { totalSaved: newCount, sources: metrics, failedSources: failed };
}

export { crawlHackerNewsAlgolia, crawlTabNews };
