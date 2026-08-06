import { describe, expect, it } from "vitest";
import {
  focusRetryDelayMs,
  hackerNewsEngagement,
  isHackerNewsRelevant,
  isUsefulComment,
  orderedCommunitySubreddits,
  parseGitHubStarCount,
  redditRateLimitDelayMs,
  redditSignalsDue,
  subredditPlan,
  summarizeSourceContent,
  todayIso,
  trendingSignalUrl,
} from "../crawler/index.js";

describe("crawler transformations", () => {
  it("crawls the focus communities before the rest", () => {
    const ordered = orderedCommunitySubreddits();
    expect(ordered.slice(0, 4).sort()).toEqual([
      "ClaudeCode",
      "GithubCopilot",
      "codex",
      "vscode",
    ]);
    expect(new Set(ordered).size).toBe(ordered.length);
  });

  it("collects more posts than it enriches with comments", () => {
    const focus = subredditPlan("ClaudeCode");
    const regular = subredditPlan("Python");

    expect(focus.focus).toBe(true);
    expect(regular.focus).toBe(false);
    // Comments are the request-expensive part: every community keeps a post
    // budget well above its comment budget so throttling costs coverage, not posts.
    for (const plan of [focus, regular]) {
      expect(plan.postLimit).toBeGreaterThan(plan.commentLimit);
    }
    expect(focus.postLimit).toBeGreaterThan(regular.postLimit);
    expect(focus.commentLimit).toBeGreaterThan(regular.commentLimit);
  });

  it("waits out Reddit throttling on focus feeds for a bounded number of tries", () => {
    expect(focusRetryDelayMs(0)).toBe(30_000);
    expect(focusRetryDelayMs(2)).toBe(120_000);
    expect(focusRetryDelayMs(3)).toBeNull();
  });

  it("computes Hacker News engagement", () => {
    expect(hackerNewsEngagement(150, 45)).toBe(240);
    expect(hackerNewsEngagement(undefined, undefined)).toBe(0);
  });

  it("parses abbreviated GitHub star counts", () => {
    expect(parseGitHubStarCount("1.2k")).toBe(1200);
    expect(parseGitHubStarCount("2m")).toBe(2_000_000);
    expect(parseGitHubStarCount("450")).toBe(450);
    expect(parseGitHubStarCount("")).toBe(0);
  });

  it("accepts only useful Reddit comments", () => {
    expect(
      isUsefulComment({
        body: "Comentário técnico detalhado sobre agentes e arquitetura, com evidência suficiente para contribuir à discussão.",
        score: 15,
        depth: 0,
      }),
    ).toBe(true);
    expect(isUsefulComment({ body: "A".repeat(100), score: 1, depth: 0 })).toBe(
      false,
    );
    expect(
      isUsefulComment({
        body: "I am a bot and this action was performed automatically. ".repeat(
          3,
        ),
        score: 10,
        depth: 0,
      }),
    ).toBe(false);
  });

  it("computes bounded Reddit rate-limit retry delays", () => {
    expect(redditRateLimitDelayMs("2")).toBe(2000);
    expect(redditRateLimitDelayMs("120")).toBe(60000);
    expect(redditRateLimitDelayMs(undefined)).toBe(3000);
  });

  it("keys GitHub Trending signals by day so a repo can trend again", () => {
    const repo = "https://github.com/cloudflare/computer";
    expect(trendingSignalUrl(repo, "daily", "2026-08-06")).toBe(
      `${repo}#trending-daily-2026-08-06`,
    );
    expect(trendingSignalUrl(repo, "daily", "2026-08-06")).not.toBe(
      trendingSignalUrl(repo, "daily", "2026-08-07"),
    );
    expect(todayIso(new Date("2026-08-06T22:15:00Z"))).toBe("2026-08-06");
  });

  it("filters the Hacker News front page by topic", () => {
    expect(
      isHackerNewsRelevant("Qwen3.8 Max now ranked best by agentic index"),
    ).toBe(true);
    expect(isHackerNewsRelevant("Machine learning for cyclones")).toBe(true);
    expect(isHackerNewsRelevant("Crime Pays but Botany Doesn't")).toBe(false);
    // "ai" must not match inside another word, or "Spain" becomes AI news.
    expect(isHackerNewsRelevant("Rain in Spain")).toBe(false);
  });

  it("throttles Reddit community signals to one sweep every six hours", () => {
    const now = new Date("2026-08-06T22:00:00Z");
    expect(redditSignalsDue(null, now)).toBe(true);
    expect(redditSignalsDue("not-a-date", now)).toBe(true);
    expect(redditSignalsDue("2026-08-06T21:00:00Z", now)).toBe(false);
    expect(redditSignalsDue("2026-08-06T16:00:00Z", now)).toBe(true);
  });

  it("turns source Markdown into usable evidence", () => {
    expect(
      summarizeSourceContent(
        "# Título\n\nO projeto reduz **custos de inferência** usando cache semântico. [Código](https://example.com) com métricas reproduzíveis.",
      ),
    ).toBe(
      "Título O projeto reduz custos de inferência usando cache semântico. Código com métricas reproduzíveis.",
    );
    expect(summarizeSourceContent("")).toBe("");
  });
});
