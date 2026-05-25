import axios from "axios";
import Parser from "rss-parser";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    // If it's XML, browser might wrap it in <pre> or show as a tree.
    // Try to get the raw content.
    const content = await page.evaluate(() => {
        const pre = document.querySelector('pre');
        if (pre) return pre.innerText;
        return document.documentElement.outerHTML;
    });
    
    // Clean up if it's still wrapped in some HTML
    const xmlMatch = content.match(/<feed[^>]*>[\s\S]*<\/feed>|<rss[^>]*>[\s\S]*<\/rss>/i);
    return xmlMatch ? xmlMatch[0] : content;
  } finally {
    await browser.close();
  }
}

export async function crawlAll(): Promise<number> {
  const sources = [...DEFAULT_SOURCES, ...getDynamicSources()].filter(s => s && s.url && s.name);
  let newCount = 0;

  for (const source of sources) {
    try {
      let feedData;
      try {
        // Try standard parser first
        feedData = await parser.parseURL(source.url);
      } catch (err: any) {
        if (err.message && (err.message.includes("403") || err.message.includes("429"))) {
          log.warn(`Standard fetch failed with ${err.message}. Attempting Playwright fallback for ${source.name}...`);
          const rawXml = await fetchWithPlaywright(source.url);
          feedData = await parser.parseString(rawXml);
        } else {
          throw err;
        }
      }

      if (!feedData || !feedData.items) continue;

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

  log.info(`Crawled ${sources.length} sources, ${newCount} new articles`);
  return newCount;
}
