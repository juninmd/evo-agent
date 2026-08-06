import { describe, expect, it } from "vitest";
import {
  bucketRadarArticles,
  displayUrl,
  fallbackReading,
  radarDate,
  radarTitle,
  renderRadarTables,
} from "../agent/radar.js";
import type { Article } from "../knowledge/store.js";

function article(overrides: Partial<Article>): Article {
  return {
    id: 1,
    title: "t",
    source: "GitHub Trending (daily)",
    url: "https://github.com/a/b#trending-daily-2026-08-06",
    summary: "s",
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-08-06T10:00:00Z",
    ...overrides,
  };
}

describe("radar", () => {
  it("routes each source to a single bucket and drops empty ones", () => {
    const buckets = bucketRadarArticles([
      article({ id: 1, source: "GitHub Trending (daily)" }),
      article({ id: 2, source: "Reddit Community Signals (ClaudeCode)" }),
      article({ id: 3, source: "Hacker News" }),
      article({ id: 4, source: "Anthropic News" }),
      article({ id: 5, source: "arXiv cs.AI" }),
      article({ id: 6, source: "TabNews" }),
    ]);
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "github",
      "reddit",
      "hackernews",
      "vendors",
      "papers",
      "community",
    ]);
    expect(buckets.every((bucket) => bucket.articles.length === 1)).toBe(true);
  });

  it("ranks by engagement inside a bucket", () => {
    const [bucket] = bucketRadarArticles([
      article({ id: 1, title: "low", engagement_score: 10 }),
      article({ id: 2, title: "high", engagement_score: 2690 }),
    ]);
    expect(bucket.articles.map((item) => item.title)).toEqual(["high", "low"]);
  });

  it("links to the repo, not to the day-scoped signal url", () => {
    expect(displayUrl("https://github.com/a/b#trending-daily-2026-08-06")).toBe(
      "https://github.com/a/b",
    );
  });

  it("renders a table per bucket and escapes pipes in titles", () => {
    const markdown = renderRadarTables(
      bucketRadarArticles([article({ title: "a | b", engagement_score: 42 })]),
    );
    expect(markdown).toContain("## GitHub Trending");
    expect(markdown).toContain("| Item | Fonte | Sinal |");
    expect(markdown).toContain("[a \\| b](https://github.com/a/b)");
    expect(markdown).toContain("| 42 |");
  });

  it("falls back to a raw ranking when the model is unavailable", () => {
    const reading = fallbackReading(
      bucketRadarArticles([
        article({ id: 1, title: "segundo", engagement_score: 5 }),
        article({ id: 2, title: "primeiro", engagement_score: 500 }),
      ]),
    );
    expect(reading).toContain("## TL;DR");
    expect(reading.indexOf("primeiro")).toBeLessThan(
      reading.indexOf("segundo"),
    );
  });

  it("names the edition by day", () => {
    expect(radarDate(new Date("2026-08-06T23:30:00Z"))).toBe("2026-08-06");
    expect(radarTitle("2026-08-06")).toBe("Radar IA — 06/08/2026");
  });
});
