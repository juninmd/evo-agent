import { describe, expect, it } from "vitest";
import {
  buildTagsFromGroups,
  groupBySourceType,
} from "../agent/editorial-renderer.js";
import type { Article } from "../knowledge/store.js";

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    title: "Titulo",
    url: "https://example.com/a",
    source: "Web Search",
    summary: "Resumo",
    tags: "[]",
    publishedAt: "2026-09-20T00:00:00.000Z",
    createdAt: "2026-09-20T00:00:00.000Z",
    ...overrides,
  } as Article;
}

describe("buildTagsFromGroups", () => {
  it("never leaks the internal searxng crawl-engine tag", () => {
    const articles = [
      article({
        source: "Web Search",
        tags: JSON.stringify(["searxng", "openai codex"]),
      }),
    ];
    const tags = buildTagsFromGroups(groupBySourceType(articles));
    expect(tags).not.toContain("searxng");
  });

  it("slugifies multi-word theme tags for safe display and URLs", () => {
    const articles = [
      article({
        source: "Web Search",
        tags: JSON.stringify(["searxng", "openai codex"]),
      }),
    ];
    const tags = buildTagsFromGroups(groupBySourceType(articles));
    expect(tags).toContain("openai-codex");
    expect(tags.some((tag) => tag.includes(" "))).toBe(false);
  });

  it("strips trailing punctuation from source-label tags (e.g. 'OpenRouter: New Models')", () => {
    const articles = [article({ source: "OpenRouter: New Models" })];
    const tags = buildTagsFromGroups(groupBySourceType(articles));
    expect(tags).toContain("openrouter");
    expect(tags.some((tag) => tag.includes(":"))).toBe(false);
  });
});
