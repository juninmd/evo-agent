import { describe, expect, it } from "vitest";
import {
  focusRetryDelayMs,
  hackerNewsEngagement,
  hackerNewsSinceEpoch,
  isUsefulComment,
  orderedCommunitySubreddits,
  parseGitHubStarCount,
  redditRateLimitDelayMs,
  redditSignalsDue,
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
    expect(redditRateLimitDelayMs(undefined)).toBe(15000);
  });

  it("keys GitHub Trending signals by day so a repo can trend again", () => {
    const repo = "https://github.com/cloudflare/computer";
    expect(trendingSignalUrl(repo, "daily", "2026-08-06")).toBe(
      `${repo}#trending-daily-2026-08-06`,
    );
    expect(trendingSignalUrl(repo, "daily", "2026-08-06")).not.toBe(
      trendingSignalUrl(repo, "daily", "2026-08-07"),
    );
    expect(
      trendingSignalUrl(`${repo}#trending-daily-2026-08-05`, "weekly", "x"),
    ).toBe(`${repo}#trending-weekly-x`);
    expect(todayIso(new Date("2026-08-06T22:15:00Z"))).toBe("2026-08-06");
  });

  it("limits Hacker News to a recent window", () => {
    const now = new Date("2026-08-06T00:00:00Z");
    expect(hackerNewsSinceEpoch(now)).toBe(
      Math.floor(now.getTime() / 1000) - 3 * 86_400,
    );
  });

  it("throttles Reddit community signals to one run every six hours", () => {
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
