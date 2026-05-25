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
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  });

  const page = await context.newPage();
  try {
    // Add extra evasions
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    
    // Wait a bit to simulate human reading and ensure dynamic content loads
    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
        // If the browser rendered the XML as a tree, it might be in a 'pre' tag
        const pre = document.querySelector('pre');
        if (pre) return pre.innerText;
        
        // Some browsers wrap raw XML in a specific structure
        const webkitXml = document.querySelector('#webkit-xml-viewer-source-xml');
        if (webkitXml) return webkitXml.innerHTML;

        return document.documentElement.outerHTML;
    });
    
    const xmlMatch = content.match(/<\?xml[^>]*>[\s\S]*|<\!doctype[^>]*>[\s\S]*|<feed[^>]*>[\s\S]*<\/feed>|<rss[^>]*>[\s\S]*<\/rss>/i);
    const finalXml = xmlMatch ? xmlMatch[0] : content;
    log.info(`Fetched ${finalXml.length} bytes. Start: ${finalXml.slice(0, 100).replace(/\n/g, ' ')}`);
    return finalXml;
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
