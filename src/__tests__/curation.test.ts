import { describe, expect, it } from "vitest";
import { curateArticles, parseTags, sourceBucket } from "../agent/curation.js";
import type { Article } from "../knowledge/store.js";

function article(
  title: string,
  source: string,
  url: string,
  score = 0,
  tags = '["ai"]',
  summary = `Resumo relevante e detalhado sobre ${title}, explicando o fato observado, seu contexto técnico e por que ele merece atenção editorial.`,
): Article {
  return {
    id: 1,
    title,
    source,
    url,
    summary,
    tags,
    engagement_score: score,
    crawled_at: "2026-06-12T10:00:00Z",
  };
}

describe("editorial curation", () => {
  it("parses malformed tags without aborting generation", () => {
    expect(parseTags("{broken")).toEqual([]);
    expect(parseTags('["AI", 1, "Agents"]')).toEqual(["ai", "agents"]);
  });

  it("deduplicates lexically similar stories and keeps independent evidence", () => {
    const result = curateArticles(
      [
        article(
          "OpenAI lança novo modelo GPT 6",
          "OpenAI Blog",
          "https://openai.com/gpt-6",
          20,
        ),
        article(
          "OpenAI lanca o novo modelo GPT-6",
          "Hacker News",
          "https://news.ycombinator.com/gpt-6",
          200,
        ),
      ],
      { max: 10, perBucket: 3 },
    );

    expect(result.selected).toHaveLength(1);
    expect(result.selected[0].evidenceUrls).toHaveLength(2);
    expect(result.rejected[0].reason).toBe("duplicate-story");
  });

  it("caps dominant buckets and preserves a primary source", () => {
    const result = curateArticles(
      [
        article("Reddit 1", "Reddit: AI", "https://reddit.com/1", 500),
        article("Reddit 2", "Reddit: AI", "https://reddit.com/2", 400),
        article("Reddit 3", "Reddit: AI", "https://reddit.com/3", 300),
        article(
          "Release oficial",
          "Anthropic News",
          "https://anthropic.com/news/release",
          1,
        ),
      ],
      { max: 3, perBucket: 2, requirePrimary: true },
    );

    expect(
      result.selected.filter(
        (item) => sourceBucket(item.article.source) === "reddit",
      ),
    ).toHaveLength(2);
    expect(result.selected.some((item) => item.primary)).toBe(true);
  });

  it("rejects placeholders and summaries without enough evidence", () => {
    const result = curateArticles(
      [
        article(
          "Sem corpo",
          "TabNews",
          "https://tabnews.com.br/1",
          100,
          '["developer"]',
          "Sem conteúdo",
        ),
        article(
          "Resumo curto",
          "TabNews",
          "https://tabnews.com.br/2",
          90,
          '["developer"]',
          "Texto curto",
        ),
        article("Fonte completa", "OpenAI Blog", "https://openai.com/full"),
      ],
      { max: 8, perBucket: 2, minSummaryLength: 80 },
    );

    expect(result.selected.map((item) => item.article.title)).toEqual([
      "Fonte completa",
    ]);
    expect(result.rejected.map((item) => item.reason)).toEqual([
      "low-information",
      "low-information",
    ]);
  });

  it("normalizes engagement across channels before ranking", () => {
    const result = curateArticles(
      [
        article(
          "Repo popular",
          "GitHub Trending (daily)",
          "https://github.com/example/repo",
          50_000,
        ),
        article(
          "Release oficial",
          "Anthropic News",
          "https://anthropic.com/news/release",
          0,
        ),
        article(
          "Discussão relevante",
          "Hacker News",
          "https://news.ycombinator.com/item?id=1",
          150,
        ),
      ],
      { max: 3, perBucket: 1, requirePrimary: true },
    );

    expect(result.selected[0].article.title).toBe("Release oficial");
    expect(result.selected.map((item) => item.article.title)).toContain(
      "Discussão relevante",
    );
  });

  it("reserves space for independent community signals", () => {
    const result = curateArticles(
      [
        article("Oficial 1", "OpenAI Blog", "https://openai.com/1"),
        article("Oficial 2", "Anthropic News", "https://anthropic.com/2"),
        article("Oficial 3", "Google AI Blog", "https://google.com/3"),
        article("Oficial 4", "The GitHub Blog", "https://github.blog/4"),
        article(
          "Comunidade 1",
          "Hacker News",
          "https://news.ycombinator.com/1",
        ),
        article("Comunidade 2", "TabNews", "https://tabnews.com.br/2"),
      ],
      {
        max: 6,
        perBucket: 2,
        requirePrimary: true,
        maxPrimaryShare: 0.65,
      },
    );

    expect(result.selected.filter((item) => item.primary)).toHaveLength(4);
    expect(result.selected.filter((item) => !item.primary)).toHaveLength(2);
  });
});
