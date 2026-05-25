import axios from "axios";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import Parser from "rss-parser";
import { getSearchKeywords } from "../agent/improver.js";
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
];

const REDDIT_USER_AGENT = "evo-agent/1.0 community-signals";
const REDDIT_POSTS_PER_SUBREDDIT = 5;
const REDDIT_COMMENTS_PER_POST = 20;
const REDDIT_MIN_COMMENT_SCORE = 3;
const REDDIT_MIN_COMMENT_LENGTH = 80;

const DEFAULT_SOURCES: FeedSource[] = [
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    tags: ["google", "ai"],
  },
  {
    name: "Anthropic News",
    url: "https://www.anthropic.com/news/rss",
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
    name: "LangChain Blog",
    url: "https://blog.langchain.dev/rss/",
    tags: ["langchain", "agents", "ai"],
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
];

function getDynamicSources(): FeedSource[] {
  try {
    const raw = db.getState("extra_sources");
    if (!raw) return [];
    return JSON.parse(raw) as FeedSource[];
  } catch {
    return [];
  }
}

async function fetchWithPlaywright(url: string): Promise<string> {
  log.info(`Using Playwright stealth to fetch: ${url}`);
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  const page = await context.newPage();
  try {
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

export async function crawlAll(): Promise<number> {
  const sources = [...DEFAULT_SOURCES, ...getDynamicSources()].filter(
    (s) => s?.url && s.name,
  );
  let newCount = 0;

  for (const source of sources) {
    try {
      let feedData: Awaited<ReturnType<typeof parser.parseURL>>;
      try {
        feedData = await parser.parseURL(source.url);
      } catch (err) {
        const message = (err as Error).message;
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
        db.saveArticle({
          title: item.title,
          source: source.name,
          url: item.link,
          summary: item.contentSnippet?.slice(0, 500) ?? "",
          tags: JSON.stringify(source.tags),
        });
        newCount++;
      }
    } catch (err) {
      log.warn(`Crawler failed for ${source.name}: ${(err as Error).message}`);
    }
  }

  const keywords = getSearchKeywords();
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
        });
        newCount++;
      }
    } catch (err) {
      log.warn(
        `Google News search crawler failed for '${keyword}': ${(err as Error).message}`,
      );
    }
  }

  for (const keyword of keywords) {
    try {
      const query = `(site:reddit.com OR site:x.com) "${keyword}"`;
      const searxngUrl = `http://searxng.searxng.svc.cluster.local/search?q=${encodeURIComponent(query)}&format=json`;
      const response = await axios.get(searxngUrl, { timeout: 5000 });
      const results = response.data?.results ?? [];
      for (const result of results.slice(0, 5)) {
        if (!result.url || !result.title) continue;
        if (db.urlExists(result.url)) continue;
        const sourceName = result.url.includes("reddit.com")
          ? `Reddit (${keyword})`
          : result.url.includes("x.com")
            ? `X/Twitter (${keyword})`
            : `Web Search (${keyword})`;
        db.saveArticle({
          title: result.title,
          source: sourceName,
          url: result.url,
          summary: result.content?.slice(0, 500) ?? "",
          tags: JSON.stringify(["searxng", keyword]),
        });
        newCount++;
      }
    } catch (err) {
      log.info(
        `SearXNG crawler skipped or failed for '${keyword}': ${(err as Error).message}`,
      );
    }
  }

  log.info(
    `Crawled ${sources.length} sources and dynamic searches, ${newCount} new articles`,
  );
  return newCount;
}
