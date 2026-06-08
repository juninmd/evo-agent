import { describe, expect, it } from "vitest";
import type { Article } from "../knowledge/store.js";

// --- Extract pure functions from writer.ts for testing ---
// We duplicate the logic here since the module has side effects (db, config, ai).

function normTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function deduplicateByStory(articles: Article[]): Article[] {
  const seen = new Map<string, Article>();
  for (const a of articles) {
    const key = normTitle(a.title);
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, a);
    } else {
      const existingScore = existing.engagement_score ?? 0;
      const newScore = a.engagement_score ?? 0;
      if (newScore > existingScore) {
        seen.set(key, a);
      }
    }
  }
  return [...seen.values()];
}

function sourceBucket(source: string): string {
  if (/^reddit/i.test(source)) return "reddit";
  if (/^google news/i.test(source)) return "google-news";
  if (/^github trending/i.test(source)) return "github-trending";
  if (/^(x\/twitter|web search)/i.test(source)) return "websearch";
  if (/^hacker news/i.test(source)) return "hackernews";
  if (/^searxng/i.test(source)) return "websearch";
  return source.toLowerCase().split(/[:(]/)[0].trim();
}

function curateArticles(
  articles: Article[],
  opts: { perBucket?: number; max?: number } = {},
): Article[] {
  const perBucket = opts.perBucket ?? Number.POSITIVE_INFINITY;
  const max = opts.max ?? Number.POSITIVE_INFINITY;
  const seen = new Set<string>();
  const bucketCount = new Map<string, number>();
  const out: Article[] = [];

  const sorted = [...articles].sort((a, b) => {
    const scoreDiff = (b.engagement_score ?? 0) - (a.engagement_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.crawled_at.localeCompare(a.crawled_at);
  });

  const deduped = deduplicateByStory(sorted);

  for (const a of deduped) {
    if (!a.summary || a.summary.trim().length === 0) continue;
    const key = normTitle(a.title);
    if (!key || seen.has(key)) continue;
    const bucket = sourceBucket(a.source);
    const bc = bucketCount.get(bucket) ?? 0;
    if (bc >= perBucket) continue;
    seen.add(key);
    bucketCount.set(bucket, bc + 1);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
}

// --- Test data factory ---
function makeArticle(
  overrides: Partial<Article> & { title: string; url: string },
): Article {
  return {
    id: overrides.id ?? 1,
    title: overrides.title,
    source: overrides.source ?? "Test Source",
    url: overrides.url,
    summary: overrides.summary ?? "A summary",
    tags: overrides.tags ?? '["test"]',
    engagement_score: overrides.engagement_score ?? 0,
    crawled_at: overrides.crawled_at ?? "2025-01-01T00:00:00Z",
  };
}

describe("normTitle", () => {
  it("normalizes accents and case", () => {
    expect(normTitle("Relatório Semanal: IA")).toBe("relatorio semanal ia");
  });

  it("replaces special chars with spaces", () => {
    expect(normTitle("GPT-4o: what's new?")).toBe("gpt 4o what s new");
  });

  it("collapses multiple spaces", () => {
    expect(normTitle("  hello   world  ")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(normTitle("")).toBe("");
  });
});

describe("sourceBucket", () => {
  it("maps Reddit sources to 'reddit'", () => {
    expect(sourceBucket("Reddit Community Signals (ClaudeAI)")).toBe("reddit");
    expect(sourceBucket("Reddit: ClaudeAI")).toBe("reddit");
  });

  it("maps Hacker News to 'hackernews'", () => {
    expect(sourceBucket("Hacker News")).toBe("hackernews");
  });

  it("maps GitHub Trending to 'github-trending'", () => {
    expect(sourceBucket("GitHub Trending (daily)")).toBe("github-trending");
  });

  it("maps Google News to 'google-news'", () => {
    expect(sourceBucket("Google News (AI agents)")).toBe("google-news");
  });

  it("maps SearXNG to 'websearch'", () => {
    expect(sourceBucket("SearXNG (claude code)")).toBe("websearch");
  });

  it("maps X/Twitter to 'websearch'", () => {
    expect(sourceBucket("X/Twitter (AI)")).toBe("websearch");
  });

  it("maps unknown sources to their prefix", () => {
    expect(sourceBucket("Anthropic News (Legacy)")).toBe("anthropic news");
  });
});

describe("deduplicateByStory", () => {
  it("keeps higher engagement_score for same story", () => {
    const articles = [
      makeArticle({
        title: "GPT-5 Released",
        url: "https://hn.ai/gpt5",
        engagement_score: 120,
      }),
      makeArticle({
        title: "GPT-5 Released",
        url: "https://reddit.com/gpt5",
        engagement_score: 45,
      }),
    ];
    const result = deduplicateByStory(articles);
    expect(result).toHaveLength(1);
    expect(result[0].engagement_score).toBe(120);
    expect(result[0].url).toBe("https://hn.ai/gpt5");
  });

  it("keeps first article when scores are equal", () => {
    const articles = [
      makeArticle({
        title: "Claude 4 Launch",
        url: "https://a.com",
        engagement_score: 50,
      }),
      makeArticle({
        title: "Claude 4 Launch",
        url: "https://b.com",
        engagement_score: 50,
      }),
    ];
    const result = deduplicateByStory(articles);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://a.com");
  });

  it("preserves different stories", () => {
    const articles = [
      makeArticle({ title: "Story A", url: "https://a.com" }),
      makeArticle({ title: "Story B", url: "https://b.com" }),
    ];
    const result = deduplicateByStory(articles);
    expect(result).toHaveLength(2);
  });

  it("handles accent-normalized duplicates", () => {
    const articles = [
      makeArticle({
        title: "Relatório Semanal",
        url: "https://a.com",
        engagement_score: 10,
      }),
      makeArticle({
        title: "Relatorio Semanal",
        url: "https://b.com",
        engagement_score: 20,
      }),
    ];
    const result = deduplicateByStory(articles);
    expect(result).toHaveLength(1);
    expect(result[0].engagement_score).toBe(20);
  });

  it("skips articles with empty normalized title", () => {
    const articles = [
      makeArticle({ title: "!!!", url: "https://a.com" }),
      makeArticle({ title: "Valid Title", url: "https://b.com" }),
    ];
    const result = deduplicateByStory(articles);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid Title");
  });
});

describe("curateArticles", () => {
  it("drops articles with empty summaries", () => {
    const articles = [
      makeArticle({ title: "No Summary", url: "https://a.com", summary: "" }),
      makeArticle({
        title: "Has Summary",
        url: "https://b.com",
        summary: "Good content",
      }),
    ];
    const result = curateArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Has Summary");
  });

  it("drops articles with whitespace-only summaries", () => {
    const articles = [
      makeArticle({
        title: "Whitespace",
        url: "https://a.com",
        summary: "   ",
      }),
      makeArticle({ title: "Good", url: "https://b.com", summary: "Content" }),
    ];
    const result = curateArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Good");
  });

  it("sorts by engagement_score descending", () => {
    const articles = [
      makeArticle({ title: "Low", url: "https://a.com", engagement_score: 5 }),
      makeArticle({
        title: "High",
        url: "https://b.com",
        engagement_score: 500,
      }),
      makeArticle({ title: "Mid", url: "https://c.com", engagement_score: 50 }),
    ];
    const result = curateArticles(articles);
    expect(result[0].title).toBe("High");
    expect(result[1].title).toBe("Mid");
    expect(result[2].title).toBe("Low");
  });

  it("respects perBucket cap", () => {
    const articles = [
      makeArticle({
        title: "R1",
        url: "https://r1.com",
        source: "Reddit: ClaudeAI",
        engagement_score: 100,
      }),
      makeArticle({
        title: "R2",
        url: "https://r2.com",
        source: "Reddit: LocalLLaMA",
        engagement_score: 90,
      }),
      makeArticle({
        title: "R3",
        url: "https://r3.com",
        source: "Reddit: OpenAI",
        engagement_score: 80,
      }),
      makeArticle({
        title: "HN1",
        url: "https://h1.com",
        source: "Hacker News",
        engagement_score: 70,
      }),
    ];
    const result = curateArticles(articles, { perBucket: 2 });
    // Reddit bucket capped at 2, HN gets 1
    const redditCount = result.filter(
      (a) => sourceBucket(a.source) === "reddit",
    ).length;
    expect(redditCount).toBe(2);
    expect(result).toHaveLength(3);
  });

  it("respects max limit", () => {
    const articles = Array.from({ length: 20 }, (_, i) =>
      makeArticle({
        title: `Article ${i}`,
        url: `https://${i}.com`,
        engagement_score: 20 - i,
      }),
    );
    const result = curateArticles(articles, { max: 5 });
    expect(result).toHaveLength(5);
  });

  it("deduplicates cross-source same-story articles", () => {
    const articles = [
      makeArticle({
        title: "GPT-5 is here",
        url: "https://hn.com/gpt5",
        source: "Hacker News",
        engagement_score: 200,
      }),
      makeArticle({
        title: "GPT-5 is here",
        url: "https://reddit.com/gpt5",
        source: "Reddit: OpenAI",
        engagement_score: 50,
      }),
    ];
    const result = curateArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].engagement_score).toBe(200);
    expect(result[0].source).toBe("Hacker News");
  });

  it("handles mixed sources with engagement ordering", () => {
    const articles = [
      makeArticle({
        title: "AI Agent Framework",
        url: "https://hn.com/1",
        source: "Hacker News",
        engagement_score: 150,
      }),
      makeArticle({
        title: "Claude Code Tips",
        url: "https://reddit.com/1",
        source: "Reddit: ClaudeAI",
        engagement_score: 80,
      }),
      makeArticle({
        title: "New LLM Benchmark",
        url: "https://gn.com/1",
        source: "Google News (LLM)",
        engagement_score: 30,
      }),
    ];
    const result = curateArticles(articles);
    expect(result[0].title).toBe("AI Agent Framework");
    expect(result).toHaveLength(3);
  });
});
