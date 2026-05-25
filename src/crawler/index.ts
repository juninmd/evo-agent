import axios from "axios";
import Parser from "rss-parser";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "EvoAgentBot/1.0 (https://github.com/juninmd/evo-agent; automated news crawler for developer insights)",
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
    url: "https://www.anthropic.com/index.xml",
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

export async function crawlAll(): Promise<number> {
  const sources = [...DEFAULT_SOURCES, ...getDynamicSources()].filter(s => s && s.url && s.name);
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
