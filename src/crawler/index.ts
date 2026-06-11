import axios from "axios";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import Parser from "rss-parser";
import { getSearchKeywords } from "../agent/improver.js";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

chromium.use(stealth());

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  },
});

interface FeedSource {
  name: string;
  url: string;
  tags: string[];
}

interface RedditComment {
  body: string;
  score: number;
  depth: number;
}

interface RedditCommentNode {
  kind?: string;
  data?: {
    body?: string;
    score?: number;
    author?: string;
    replies?: string | RedditListing;
  };
}

interface RedditListing {
  data?: {
    children?: RedditCommentNode[];
  };
}

interface RedditPostCandidate {
  subreddit: string;
  title: string;
  url: string;
}

const REDDIT_COMMUNITY_SUBREDDITS = [
  "LocalLLaMA",
  "MachineLearning",
  "OpenAI",
  "ClaudeAI",
  "ChatGPTCoding",
  "LLMDevs",
  "artificial",
  "singularity",
  "ChatGPT",
  "ArtificialIntelligence",
  "deeplearning",
  "StableDiffusion",
  "Cursor",
  "CursorIDE",
  "vibecoding",
  "kilocode",
  "opencode",
];

const REDDIT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REDDIT_POSTS_PER_SUBREDDIT = 5;
const REDDIT_COMMENTS_PER_POST = 20;
const REDDIT_MIN_COMMENT_SCORE = 3;
const REDDIT_MIN_COMMENT_LENGTH = 80;

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

const DEFAULT_SOURCES: FeedSource[] = [
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    tags: ["google", "ai"],
  },
  {
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    tags: ["anthropic", "claude", "ai"],
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    tags: ["openai", "ai"],
  },
  {
    name: "VSCode Updates",
    url: "https://code.visualstudio.com/feed.xml",
    tags: ["vscode", "tools", "developer"],
  },
  {
    name: "The GitHub Blog",
    url: "https://github.blog/feed/",
    tags: ["github", "developer", "ai"],
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    tags: ["huggingface", "ai", "models"],
  },
  {
    name: "Lil'Log (Lilian Weng)",
    url: "https://lilianweng.github.io/index.xml",
    tags: ["ai", "ml", "research", "llm"],
  },
  {
    name: "Reddit: ClaudeAI",
    url: "https://www.reddit.com/r/ClaudeAI/.rss",
    tags: ["reddit", "claude", "ai"],
  },
  {
    name: "Reddit: ClaudeCode",
    url: "https://www.reddit.com/r/ClaudeCode/.rss",
    tags: ["reddit", "claude", "coding", "ai"],
  },
  {
    name: "Reddit: Claude",
    url: "https://www.reddit.com/r/claude/.rss",
    tags: ["reddit", "claude", "ai"],
  },
  {
    name: "Reddit: VSCode",
    url: "https://www.reddit.com/r/vscode/.rss",
    tags: ["reddit", "vscode", "tools"],
  },
  {
    name: "Reddit: GithubCopilot",
    url: "https://www.reddit.com/r/GithubCopilot/.rss",
    tags: ["reddit", "github", "copilot", "ai"],
  },
  {
    name: "Reddit: KiloCode",
    url: "https://www.reddit.com/r/kilocode/.rss",
    tags: ["reddit", "kilocode", "coding"],
  },
  {
    name: "Reddit: OpenCode",
    url: "https://www.reddit.com/r/opencode/.rss",
    tags: ["reddit", "opencode", "coding"],
  },
  {
    name: "Reddit Search: claude code",
    url: "https://www.reddit.com/search/.rss?q=claude+code&sort=new",
    tags: ["reddit", "claude", "coding", "ai", "search"],
  },
  {
    name: "V2EX Tech",
    url: "https://www.v2ex.com/feed/tab/tech.xml",
    tags: ["v2ex", "chinese", "ai", "developer"],
  },
  {
    name: "Mistral AI",
    url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml",
    tags: ["ai frontier", "mistralai", "ai"],
  },
  {
    name: "Together AI",
    url: "https://www.together.ai/blog/rss.xml",
    tags: ["ai frontier", "togetherai", "ai"],
  },
  {
    name: "Google Research",
    url: "https://research.google/blog/rss/",
    tags: ["ai frontier", "googleresearch", "ai"],
  },
  {
    name: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    tags: ["ai frontier", "googledeepmind", "ai"],
  },
  {
    name: "Hacker News: AI",
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+agent&count=15",
    tags: ["hackernews", "ai", "developer"],
  },
  {
    name: "Hacker News: Machine Learning",
    url: "https://hnrss.org/newest?q=machine+learning+OR+deep+learning+OR+transformer&count=15",
    tags: ["hackernews", "ml", "research"],
  },
];

// Circuit breaker: track consecutive failures per source name.
// After CIRCUIT_OPEN_THRESHOLD failures, skip the source for CIRCUIT_SKIP_CYCLES crawl cycles.
const CIRCUIT_OPEN_THRESHOLD = 3;
const CIRCUIT_SKIP_CYCLES = 5;
const sourceConsecutiveFailures = new Map<string, number>();
const sourceSkipRemaining = new Map<string, number>();

function circuitAllow(name: string): boolean {
  const skip = sourceSkipRemaining.get(name) ?? 0;
  if (skip > 0) {
    sourceSkipRemaining.set(name, skip - 1);
    return false;
  }
  return true;
}

function circuitSuccess(name: string) {
  sourceConsecutiveFailures.delete(name);
}

function circuitFailure(name: string) {
  const failures = (sourceConsecutiveFailures.get(name) ?? 0) + 1;
  sourceConsecutiveFailures.set(name, failures);
  if (failures >= CIRCUIT_OPEN_THRESHOLD) {
    sourceSkipRemaining.set(name, CIRCUIT_SKIP_CYCLES);
    sourceConsecutiveFailures.delete(name);
    log.warn(
      `Circuit breaker opened for "${name}" after ${failures} consecutive failures — skipping next ${CIRCUIT_SKIP_CYCLES} cycles`,
    );
  }
}

function getDynamicSources(): FeedSource[] {
  try {
    const raw = db.getState("extra_sources");
    if (!raw) return [];
    return JSON.parse(raw) as FeedSource[];
  } catch {
    return [];
  }
}

const GITHUB_TRENDING_AI_KEYWORDS = [
  "ai",
  "agent",
  "claude",
  "codex",
  "copilot",
  "gpt",
  "llm",
  "model",
  "ml",
  "deepseek",
  "gemini",
  "opus",
  "qwen",
  "cursor",
  "litellm",
  "mcp",
  "rag",
  "embedding",
  "transformer",
  "diffusion",
  "neural",
  "inference",
  "fine-tun",
  "openai",
  "anthropic",
  "huggingface",
  "langchain",
  "ollama",
  "vllm",
  "whisper",
  "stable-diffusion",
  "text-to-speech",
  "speech-to-text",
  "computer-vision",
  "nlp",
  "chatbot",
  "prompt",
  "tokenizer",
];

async function crawlGitHubTrending(): Promise<number> {
  let newCount = 0;
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    for (const range of ["daily", "weekly"] as const) {
      try {
        await page.goto(`https://github.com/trending?since=${range}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        const repos = await page.evaluate(() => {
          const articles = document.querySelectorAll("article.Box-row");
          return Array.from(articles)
            .slice(0, 25)
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

        for (const repo of repos) {
          if (!repo.url || !repo.name) continue;
          if (db.urlExists(repo.url)) continue;

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

          const starCount =
            Number.parseInt(repo.stars.replace(/[^0-9]/g, ""), 10) || 0;
          db.saveArticle({
            title: repo.name,
            source: `GitHub Trending (${range})`,
            url: repo.url,
            summary,
            tags: JSON.stringify([
              "github",
              "trending",
              "ai",
              range,
              repo.language?.toLowerCase() ?? "unknown",
            ]),
            engagement_score: starCount,
          });
          newCount++;
        }
      } catch (err) {
        log.warn(
          `GitHub Trending (${range}) failed: ${(err as Error).message}`,
        );
      }
    }
  } finally {
    await browser.close();
  }

  log.info(`Crawled GitHub Trending, ${newCount} new AI repos`);
  return newCount;
}

async function fetchWithPlaywright(url: string): Promise<string> {
  log.info(`Using Playwright stealth to fetch: ${url}`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
      const pre = document.querySelector("pre");
      if (pre) return pre.innerText;

      const webkitXml = document.querySelector("#webkit-xml-viewer-source-xml");
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
  } finally {
    await browser.close();
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isV2exAiRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return V2EX_AI_KEYWORDS.some((kw) => lower.includes(kw));
}

function isUsefulComment(comment: RedditComment): boolean {
  const body = comment.body.toLowerCase();
  return (
    comment.score >= REDDIT_MIN_COMMENT_SCORE &&
    comment.body.length >= REDDIT_MIN_COMMENT_LENGTH &&
    body !== "[deleted]" &&
    body !== "[removed]" &&
    !body.startsWith("i am a bot")
  );
}

function isUsefulRedditPost(title: string): boolean {
  const normalized = title.toLowerCase();
  const lowSignalPatterns = [
    "drop your projects",
    "share what you're working on",
    "share what you are working on",
    "shout out",
    "shoutout",
    "instagram",
  ];
  return !lowSignalPatterns.some((pattern) => normalized.includes(pattern));
}

function flattenComments(
  listing: RedditListing | undefined,
  depth = 0,
): RedditComment[] {
  const children = listing?.data?.children ?? [];
  const comments: RedditComment[] = [];

  for (const child of children) {
    if (child.kind !== "t1" || !child.data?.body) continue;

    comments.push({
      body: normalizeText(child.data.body),
      score: child.data.score ?? 0,
      depth,
    });

    if (typeof child.data.replies === "object") {
      comments.push(...flattenComments(child.data.replies, depth + 1));
    }
  }

  return comments;
}

function redditJsonUrl(postUrl: string): string {
  const cleanUrl = postUrl.split("?")[0].replace(/\/$/, "");
  return `${cleanUrl}.json?limit=50&depth=3&sort=top`;
}

function signalUrl(postUrl: string): string {
  return `${postUrl.split("#")[0]}#community-signals`;
}

function buildCommunitySignalSummary(
  post: RedditPostCandidate,
  comments: RedditComment[],
): string {
  const topComments = comments
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((comment) => {
      const body =
        comment.body.length > 220
          ? `${comment.body.slice(0, 217).trim()}...`
          : comment.body;
      return `score ${comment.score}: ${body}`;
    });

  return normalizeText(
    [
      `Sinais da comunidade em r/${post.subreddit} sobre "${post.title}".`,
      `Comentarios uteis analisados: ${comments.length}.`,
      `Top comments: ${topComments.join(" | ")}`,
    ].join(" "),
  ).slice(0, 1800);
}

async function getRedditPostCandidates(
  subreddit: string,
): Promise<RedditPostCandidate[]> {
  const response = await axios.get(
    `https://www.reddit.com/r/${subreddit}/new/.rss`,
    {
      headers: {
        Accept: "application/atom+xml, application/xml",
        "User-Agent": REDDIT_USER_AGENT,
      },
      timeout: 8000,
    },
  );
  const feed = await parser.parseString(response.data);

  return feed.items.slice(0, REDDIT_POSTS_PER_SUBREDDIT).flatMap((item) => {
    if (!item.title || !item.link) return [];
    if (!isUsefulRedditPost(item.title)) return [];
    return [{ subreddit, title: item.title, url: item.link }];
  });
}

async function getRedditComments(postUrl: string): Promise<RedditComment[]> {
  const response = await axios.get(redditJsonUrl(postUrl), {
    headers: { "User-Agent": REDDIT_USER_AGENT },
    timeout: 8000,
  });
  const listing = response.data?.[1] as RedditListing | undefined;
  return flattenComments(listing)
    .filter(isUsefulComment)
    .sort((a, b) => b.score - a.score)
    .slice(0, REDDIT_COMMENTS_PER_POST);
}

export async function crawlRedditCommunitySignals(): Promise<number> {
  let newCount = 0;

  for (const subreddit of REDDIT_COMMUNITY_SUBREDDITS) {
    let posts: RedditPostCandidate[] = [];
    try {
      posts = await getRedditPostCandidates(subreddit);
    } catch (err) {
      log.warn(
        `Reddit feed failed for r/${subreddit}: ${(err as Error).message}`,
      );
      continue;
    }

    for (const post of posts) {
      const url = signalUrl(post.url);
      if (db.urlExists(url)) continue;

      try {
        const comments = await getRedditComments(post.url);
        if (comments.length === 0) continue;

        const topScore = comments.length > 0 ? comments[0].score : 0;
        db.saveArticle({
          title: `Discussao: ${post.title}`,
          source: `Reddit Community Signals (${post.subreddit})`,
          url,
          summary: buildCommunitySignalSummary(post, comments),
          tags: JSON.stringify([
            "reddit",
            "community-signals",
            "experimental",
            post.subreddit.toLowerCase(),
          ]),
          engagement_score: topScore,
        });
        newCount++;
      } catch (err) {
        log.info(
          `Reddit comments skipped for r/${post.subreddit}: ${(err as Error).message}`,
        );
      }
    }
  }

  log.info(`Crawled Reddit community signals, ${newCount} new digests`);
  return newCount;
}

async function crawlHackerNewsAlgolia(): Promise<number> {
  let newCount = 0;
  const queries = [
    { tag: "ai", query: "AI OR LLM OR GPT OR Claude OR agent" },
    { tag: "ml", query: "machine learning OR deep learning OR transformer" },
  ];

  for (const { tag, query } of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20&numericFilters=points>5`;
      const response = await axios.get(url, { timeout: 10000 });
      const hits = response.data?.hits ?? [];

      for (const hit of hits) {
        const storyUrl =
          hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (!hit.title || db.urlExists(storyUrl)) continue;

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
          engagement_score: points + numComments * 2,
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

async function crawlTabNews(): Promise<number> {
  let newCount = 0;
  try {
    const url =
      "https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=30";
    const response = await axios.get(url, { timeout: 15000 });
    const contents = response.data ?? [];

    for (const item of contents) {
      if (!item.title || !item.slug || item.status !== "published") continue;

      const postUrl = `https://www.tabnews.com.br/${item.owner_username}/${item.slug}`;
      if (db.urlExists(postUrl)) continue;

      const tabcoins = item.tabcoins ?? 0;
      const comments = item.children_deep_count ?? 0;
      const summary = item.body
        ? item.body
            .replace(/[#*`\[\]()>]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 400)
        : "Sem conteúdo";

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

async function crawlLinkedInTopContent(url: string): Promise<number> {
  log.info(`Crawling LinkedIn Top Content: ${url}`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let newCount = 0;
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Extract articles from LinkedIn Top Content page
    // Based on typical LinkedIn Top Content structure (selectors might need updates)
    const articles = await page.evaluate(() => {
      const items = document.querySelectorAll(
        '.top-content-card, [data-test-id="top-content-card"], article',
      );
      return Array.from(items).map((item) => {
        const titleEl = item.querySelector("h2, h3, .title");
        const linkEl = item.querySelector("a");
        return {
          title: titleEl?.textContent?.trim() ?? "",
          url: linkEl?.href ?? "",
          summary:
            item.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) ?? "",
        };
      });
    });

    for (const article of articles) {
      if (!article.url || !article.title) continue;
      if (db.urlExists(article.url)) continue;

      db.saveArticle({
        title: article.title,
        source: "LinkedIn AI Innovations",
        url: article.url,
        summary: article.summary,
        tags: JSON.stringify(["ai", "innovation", "linkedin", "trends"]),
        engagement_score: 0,
      });
      newCount++;
    }
  } catch (err) {
    log.warn(`LinkedIn crawler failed: ${(err as Error).message}`);
  } finally {
    await browser.close();
  }
  return newCount;
}

async function crawlAnthropicNewsDirect(source: FeedSource): Promise<number> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let newCount = 0;
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    await page.goto(source.url, { waitUntil: "networkidle", timeout: 30000 });

    const articles = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href^="/news/"]');
      return Array.from(links)
        .map((a) => {
          const href = a.getAttribute("href") ?? "";
          const titleEl = a.querySelector('h2, h3, h4, [class*="title"]');
          const title = titleEl
            ? titleEl.textContent?.trim()
            : a.textContent?.trim();
          const descEl = a.querySelector("p");
          const summary = descEl ? descEl.textContent?.trim() : "";
          return {
            title: title ?? "",
            url: href.startsWith("http")
              ? href
              : `https://www.anthropic.com${href}`,
            summary: summary ?? "",
          };
        })
        .filter(
          (item) =>
            item.title &&
            item.url &&
            item.url !== "https://www.anthropic.com/news",
        );
    });

    for (const article of articles.slice(0, 10)) {
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
  } catch (err) {
    log.warn(`Anthropic crawler failed: ${(err as Error).message}`);
  } finally {
    await browser.close();
  }
  return newCount;
}

export async function crawlAll(): Promise<number> {
  const sources = [...DEFAULT_SOURCES, ...getDynamicSources()].filter(
    (s) => s?.url && s.name,
  );
  let newCount = 0;
  const metrics: Record<string, { saved: number; failed: boolean }> = {};

  for (const source of sources) {
    if (!circuitAllow(source.name)) {
      log.debug(`Circuit breaker: skipping "${source.name}"`);
      continue;
    }
    metrics[source.name] = { saved: 0, failed: false };
    try {
      if (source.url === "https://www.anthropic.com/news") {
        log.info(`Scraping Anthropic News directly from: ${source.url}`);
        const count = await crawlAnthropicNewsDirect(source);
        newCount += count;
        metrics[source.name].saved = count;
        circuitSuccess(source.name);
        continue;
      }
      let feedData: Awaited<ReturnType<typeof parser.parseURL>>;
      try {
        feedData = await parser.parseURL(source.url);
      } catch (err) {
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

      if (!feedData?.items) continue;

      for (const item of feedData.items.slice(0, 10)) {
        if (!item.link || !item.title) continue;
        if (db.urlExists(item.link)) continue;
        if (source.name.startsWith("V2EX") && !isV2exAiRelevant(item.title))
          continue;
        db.saveArticle({
          title: item.title,
          source: source.name,
          url: item.link,
          summary: item.contentSnippet?.slice(0, 500) ?? "",
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
        `Crawler failed for ${source.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const keywords = getSearchKeywords();
  let googleNewsSaved = 0;
  for (const keyword of keywords) {
    try {
      const queryUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
      const feed = await parser.parseURL(queryUrl);
      for (const item of feed.items.slice(0, 5)) {
        if (!item.link || !item.title) continue;
        if (db.urlExists(item.link)) continue;
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
      log.warn(
        `Google News search crawler failed for '${keyword}': ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  metrics["Google News (keywords)"] = { saved: googleNewsSaved, failed: false };

  let searxngSaved = 0;
  for (const keyword of keywords) {
    try {
      const cleanKeyword = keyword.slice(0, 60).trim();
      const query = `(site:reddit.com OR site:x.com) "${cleanKeyword}"`;
      const searxngUrl = `${config.searxngUrl}/search?q=${encodeURIComponent(query)}&format=json`;
      const response = await axios.get(searxngUrl, { timeout: 5000 });
      const results = response.data?.results ?? [];
      for (const result of results.slice(0, 5)) {
        if (!result.url || !result.title) continue;
        if (db.urlExists(result.url)) continue;
        const sourceName = result.url.includes("reddit.com")
          ? `Reddit (${cleanKeyword})`
          : result.url.includes("x.com")
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
      log.warn(
        `SearXNG failed for '${keyword.slice(0, 40)}': ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  metrics["SearXNG (keywords)"] = { saved: searxngSaved, failed: false };

  const extras: Array<{ name: string; fn: () => Promise<number> }> = [
    {
      name: "LinkedIn AI Trends",
      fn: () =>
        crawlLinkedInTopContent(
          "https://www.linkedin.com/top-content/innovation/ai-trends-and-innovations/",
        ),
    },
    { name: "GitHub Trending", fn: crawlGitHubTrending },
    { name: "Hacker News Algolia", fn: crawlHackerNewsAlgolia },
    { name: "TabNews", fn: crawlTabNews },
  ];
  for (const extra of extras) {
    if (!circuitAllow(extra.name)) {
      log.debug(`Circuit breaker: skipping "${extra.name}"`);
      continue;
    }
    try {
      const count = await extra.fn();
      newCount += count;
      metrics[extra.name] = { saved: count, failed: false };
      circuitSuccess(extra.name);
    } catch (err) {
      metrics[extra.name] = { saved: 0, failed: true };
      circuitFailure(extra.name);
      log.warn(
        `${extra.name} crawler failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const failed = Object.entries(metrics)
    .filter(([, v]) => v.failed)
    .map(([k]) => k);
  const summary = Object.entries(metrics)
    .filter(([, v]) => !v.failed && v.saved > 0)
    .map(([k, v]) => `${k}:${v.saved}`)
    .join(", ");
  log.info(
    `Crawl complete — ${newCount} new articles. Saved by source: [${summary || "none"}]${failed.length ? `. Failed: [${failed.join(", ")}]` : ""}`,
  );
  return newCount;
}

export { crawlHackerNewsAlgolia, crawlTabNews };
