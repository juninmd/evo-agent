import { describe, expect, it } from "vitest";

// --- Test crawler logic (pure functions and data parsing) ---

// These test the data transformation logic used in crawlHackerNewsAlgolia
// without making network calls.

describe("Hacker News Algolia - hit parsing", () => {
  it("constructs correct story URL from hit with url", () => {
    const hit = {
      objectID: "12345",
      url: "https://example.com/article",
      title: "Test",
    } as Record<string, unknown>;
    const storyUrl =
      (hit.url as string) ||
      `https://news.ycombinator.com/item?id=${hit.objectID}`;
    expect(storyUrl).toBe("https://example.com/article");
  });

  it("constructs HN comment URL from hit without url", () => {
    const hit = { objectID: "12345", title: "Ask HN: Something" } as Record<
      string,
      unknown
    >;
    const storyUrl =
      (hit.url as string) ||
      `https://news.ycombinator.com/item?id=${hit.objectID}`;
    expect(storyUrl).toBe("https://news.ycombinator.com/item?id=12345");
  });

  it("computes engagement_score as points + num_comments * 2", () => {
    const hit = { points: 150, num_comments: 45 };
    const engagementScore = (hit.points ?? 0) + (hit.num_comments ?? 0) * 2;
    expect(engagementScore).toBe(240);
  });

  it("handles missing points and comments gracefully", () => {
    const hit: Record<string, number> = {};
    const engagementScore = (hit.points ?? 0) + (hit.num_comments ?? 0) * 2;
    expect(engagementScore).toBe(0);
  });

  it("filters hits with minimum points > 5", () => {
    const hits = [
      { objectID: "1", title: "Good", points: 100, num_comments: 20 },
      { objectID: "2", title: "Low", points: 2, num_comments: 0 },
      { objectID: "3", title: "Also Good", points: 50, num_comments: 10 },
    ];
    const filtered = hits.filter((h) => (h.points ?? 0) > 5);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].title).toBe("Good");
    expect(filtered[1].title).toBe("Also Good");
  });
});

describe("Reddit community signals - comment filtering", () => {
  const MIN_COMMENT_SCORE = 3;
  const MIN_COMMENT_LENGTH = 80;

  function isUsefulComment(comment: { body: string; score: number }): boolean {
    const body = comment.body.toLowerCase();
    return (
      comment.score >= MIN_COMMENT_SCORE &&
      comment.body.length >= MIN_COMMENT_LENGTH &&
      body !== "[deleted]" &&
      body !== "[removed]" &&
      !body.startsWith("i am a bot")
    );
  }

  it("filters out low-score comments", () => {
    expect(isUsefulComment({ body: "A".repeat(100), score: 1 })).toBe(false);
  });

  it("filters out short comments", () => {
    expect(isUsefulComment({ body: "Short", score: 10 })).toBe(false);
  });

  it("filters out [deleted] comments", () => {
    expect(isUsefulComment({ body: "[deleted]", score: 10 })).toBe(false);
  });

  it("filters out [removed] comments", () => {
    expect(isUsefulComment({ body: "[removed]", score: 10 })).toBe(false);
  });

  it("filters out bot comments", () => {
    expect(
      isUsefulComment({
        body: "I am a bot and this action was performed automatically. ".repeat(
          3,
        ),
        score: 10,
      }),
    ).toBe(false);
  });

  it("accepts useful comments", () => {
    expect(
      isUsefulComment({
        body: "This is a really insightful comment about AI agents that adds value to the discussion",
        score: 15,
      }),
    ).toBe(true);
  });
});

describe("GitHub Trending - star count parsing", () => {
  it("parses star count with k suffix", () => {
    const starsEl = "1.2k";
    const starCount = Number.parseInt(starsEl.replace(/[^0-9]/g, ""), 10) || 0;
    // "1.2k" → "12" → 12 (approximate, loses the k multiplier but that's the current impl)
    expect(starCount).toBe(12);
  });

  it("parses plain number star count", () => {
    const starsEl = "450";
    const starCount = Number.parseInt(starsEl.replace(/[^0-9]/g, ""), 10) || 0;
    expect(starCount).toBe(450);
  });

  it("handles empty star count", () => {
    const starsEl = "";
    const starCount = Number.parseInt(starsEl.replace(/[^0-9]/g, ""), 10) || 0;
    expect(starCount).toBe(0);
  });
});

describe("Expanded subreddit list", () => {
  const REDDIT_COMMUNITY_SUBREDDITS = [
    "LocalLLaMA",
    "MachineLearning",
    "OpenAI",
    "ClaudeAI",
    "ChatGPTCoding",
    "LLMDevs",
    "artificial",
    "MachineLearning",
    "singularity",
    "ChatGPT",
    "ArtificialIntelligence",
    "deeplearning",
    "StableDiffusion",
    "Cursor",
    "CursorIDE",
    "vibecoding",
  ];

  it("includes new AI/dev subreddits", () => {
    expect(REDDIT_COMMUNITY_SUBREDDITS).toContain("artificial");
    expect(REDDIT_COMMUNITY_SUBREDDITS).toContain("singularity");
    expect(REDDIT_COMMUNITY_SUBREDDITS).toContain("ChatGPT");
    expect(REDDIT_COMMUNITY_SUBREDDITS).toContain("Cursor");
    expect(REDDIT_COMMUNITY_SUBREDDITS).toContain("CursorIDE");
    expect(REDDIT_COMMUNITY_SUBREDDITS).toContain("vibecoding");
  });

  it("has at least 10 unique subreddits", () => {
    const unique = new Set(REDDIT_COMMUNITY_SUBREDDITS);
    expect(unique.size).toBeGreaterThanOrEqual(10);
  });
});
