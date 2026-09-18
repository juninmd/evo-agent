import { describe, expect, it } from "vitest";
import { curateArticles } from "../agent/curation.js";
import { renderLaunchHighlights } from "../agent/radar.js";
import {
  newModelLaunches,
  rankTrendingModels,
} from "../crawler/model-launches.js";
import type { Article } from "../knowledge/store.js";
import { isLaunchOfDay, launchTag } from "../utils/launch.js";

const NOW = new Date("2026-09-18T12:00:00Z");
const hoursAgo = (hours: number) =>
  Math.floor((NOW.getTime() - hours * 3_600_000) / 1000);

function article(overrides: Partial<Article>): Article {
  return {
    id: 1,
    title: "t",
    source: "OpenRouter: New Models",
    url: "https://openrouter.ai/openai/gpt-7",
    summary: "1050000 tokens de contexto. Flagship model.",
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-09-18T11:00:00Z",
    ...overrides,
  };
}

const launched = (hours: number) =>
  JSON.stringify(["models", launchTag(hoursAgo(hours))]);

describe("launch of the day", () => {
  it("counts a model released in the last 24 hours, by release date not crawl date", () => {
    expect(isLaunchOfDay(article({ tags: launched(3) }), NOW)).toBe(true);
    expect(isLaunchOfDay(article({ tags: launched(23) }), NOW)).toBe(true);
    // Crawled today, released 13 days ago: backfill, not today's news.
    expect(isLaunchOfDay(article({ tags: launched(13 * 24) }), NOW)).toBe(
      false,
    );
    expect(isLaunchOfDay(article({ tags: "[]" }), NOW)).toBe(false);
    expect(isLaunchOfDay(article({ tags: '["launched-abc"]' }), NOW)).toBe(
      false,
    );
  });

  it("stamps the release time on OpenRouter launches and HF trending models", () => {
    const [launch] = newModelLaunches(
      [{ id: "openai/gpt-7", name: "OpenAI: GPT-7", created: hoursAgo(2) }],
      NOW,
    );
    expect(launch.launchedAt).toBe(hoursAgo(2));
    const [trending] = rankTrendingModels(
      [
        {
          id: "Qwen/Qwen4-32B",
          trendingScore: 900,
          createdAt: "2026-09-18T08:00:00.000Z",
        },
      ],
      "2026-09-18",
    );
    expect(trending.launchedAt).toBe(hoursAgo(4));
  });

  it("opens the radar with every model launched today, once each", () => {
    const section = renderLaunchHighlights(
      [
        article({ id: 1, title: "OpenAI: GPT-7", tags: launched(2) }),
        article({
          id: 2,
          title: "OpenAI: GPT-7",
          url: "https://openrouter.ai/openai/gpt-7:free",
          tags: launched(2),
        }),
        article({
          id: 3,
          title: "Qwen/Qwen4-32B",
          source: "HF Trending Models",
          url: "https://huggingface.co/Qwen/Qwen4-32B#trending-2026-09-18",
          tags: launched(5),
        }),
        article({ id: 4, title: "Old model", tags: launched(200) }),
      ],
      NOW,
    );
    expect(section.startsWith("## Lançamento do dia")).toBe(true);
    expect(section.match(/GPT-7/g)).toHaveLength(1);
    expect(section).toContain("https://huggingface.co/Qwen/Qwen4-32B)");
    expect(section).not.toContain("Old model");
  });

  it("merges the same launch seen on OpenRouter and on the Hub into one line", () => {
    const section = renderLaunchHighlights(
      [
        article({
          id: 1,
          title: "deepseek-ai/DeepSeek-V4.1-Flash",
          source: "HF Trending Models",
          url: "https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash#trending-2026-09-18",
          tags: launched(2),
        }),
        article({
          id: 2,
          title: "DeepSeek: DeepSeek V4.1 Flash",
          url: "https://openrouter.ai/deepseek/deepseek-v4.1-flash",
          tags: launched(2),
        }),
      ],
      NOW,
    );
    const lines = section.split("\n").filter((line) => line.startsWith("- "));
    expect(lines).toHaveLength(1);
    // The vendor catalog entry leads; the Hub signal is kept as a second source.
    expect(lines[0]).toContain("[DeepSeek: DeepSeek V4.1 Flash]");
    expect(lines[0]).toContain("OpenRouter: New Models · HF Trending Models");
  });

  it("renders nothing when no model launched today", () => {
    expect(renderLaunchHighlights([article({ tags: launched(48) })], NOW)).toBe(
      "",
    );
  });

  it("puts today's launch first in the daily edition's curation", () => {
    const strongPrimary = article({
      id: 1,
      title: "Anthropic publishes a long engineering post about agents",
      source: "Anthropic News",
      url: "https://www.anthropic.com/news/agents",
      summary: "x".repeat(600),
      engagement_score: 5000,
      tags: JSON.stringify(["anthropic", "agents", "engineering", "claude"]),
    });
    const launch = article({
      id: 2,
      title: "OpenAI: GPT-7",
      tags: launched(1),
    });
    const { selected } = curateArticles([strongPrimary, launch], {
      now: NOW.getTime(),
    });
    expect(selected[0].article.title).toBe("OpenAI: GPT-7");
  });
});
