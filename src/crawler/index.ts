import axios from "axios";
import Parser from "rss-parser";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

const parser = new Parser({ timeout: 10000 });

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
    url: "https://www.anthropic.com/news/rss.xml",
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

export async function crawlAll(): Promise<number> {
  const sources = [...DEFAULT_SOURCES, ...getDynamicSources()];
  let newCount = 0;

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items.slice(0, 10)) {
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
