import { describe, expect, it } from "vitest";
import {
  describeCrawlerError,
  hackerNewsEngagement,
  hostnameOf,
  isCitableXUrl,
  isHackerNewsRelevant,
  isHost,
  parseGitHubStarCount,
  summarizeSourceContent,
  todayIso,
  trendingSignalUrl,
} from "../crawler/index.js";
import {
  focusRetryDelayMs,
  isUsefulComment,
  orderedCommunitySubreddits,
  redditBudgetDelayMs,
  redditFeedDue,
  redditRateLimitDelayMs,
  redditSignalsDue,
  subredditPlan,
} from "../crawler/reddit.js";

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

  // O 429 anonimo do Reddit nao manda retry-after: so x-ratelimit-reset, em
  // segundos. Com o retry cego de 3s a fonte era perdida pelo resto do ciclo.
  it("falls back to x-ratelimit-reset when retry-after is absent", () => {
    expect(redditRateLimitDelayMs(undefined, "12")).toBe(12000);
    expect(redditRateLimitDelayMs(undefined, 15)).toBe(15000);
    // retry-after continua tendo precedencia quando vem.
    expect(redditRateLimitDelayMs("2", "30")).toBe(2000);
    // e o teto segue valendo para o reset.
    expect(redditRateLimitDelayMs(undefined, "600")).toBe(60000);
  });

  it("only slows the pace when the anonymous Reddit budget is exhausted", () => {
    expect(
      redditBudgetDelayMs({
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "12",
      }),
    ).toBe(12000);
    expect(
      redditBudgetDelayMs({
        "x-ratelimit-remaining": "0.0",
        "x-ratelimit-reset": "7",
      }),
    ).toBe(7000);
    // Ainda ha orcamento: o ritmo normal do crawler vale.
    expect(
      redditBudgetDelayMs({
        "x-ratelimit-remaining": "1",
        "x-ratelimit-reset": "12",
      }),
    ).toBeNull();
    // Sem os cabecalhos nao ha o que respeitar.
    expect(redditBudgetDelayMs({})).toBeNull();
    expect(redditBudgetDelayMs(undefined)).toBeNull();
    expect(redditBudgetDelayMs({ "x-ratelimit-remaining": "0" })).toBeNull();
    // E o teto vale aqui tambem.
    expect(
      redditBudgetDelayMs({
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "900",
      }),
    ).toBe(60000);
  });

  // "Crawler failed for Google Research: " nao dizia nada; o status HTTP e o
  // codigo do axios e o que sobra para agir.
  it("describes a crawler failure even when the message is empty", () => {
    const axiosLike = Object.assign(new Error(""), {
      isAxiosError: true,
      code: "ERR_BAD_RESPONSE",
      response: { status: 500 },
    });
    expect(describeCrawlerError(axiosLike)).toBe("HTTP 500 · ERR_BAD_RESPONSE");

    expect(describeCrawlerError(new Error(""))).toBe("Error");
    expect(describeCrawlerError(new Error("timeout"))).toBe("timeout");
    expect(describeCrawlerError("   ")).toBe("falha sem detalhe");
    expect(describeCrawlerError("quebrou")).toBe("quebrou");
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

  it("throttles a single Reddit feed source to one attempt every 20 minutes", () => {
    // A manual crawl minutes after the hourly cron must not re-hit the same
    // still-throttled subreddit, or it wastes the per-IP budget and can trip
    // the circuit breaker for hours.
    const now = new Date("2026-08-06T22:00:00Z");
    expect(redditFeedDue(null, now)).toBe(true);
    expect(redditFeedDue("not-a-date", now)).toBe(true);
    expect(redditFeedDue("2026-08-06T21:45:00Z", now)).toBe(false);
    expect(redditFeedDue("2026-08-06T21:39:00Z", now)).toBe(true);
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

  // Release notes name env vars and flags; dropping their underscores
  // published "CLAUDE CODE GATEWAY HINT HEADERS=1" as if it were prose.
  it("keeps underscores inside identifiers while stripping emphasis", () => {
    expect(
      summarizeSourceContent(
        "Set `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1` to enable _new_ headers in snake_case __apis__.",
      ),
    ).toBe(
      "Set CLAUDE_CODE_GATEWAY_HINT_HEADERS=1 to enable new headers in snake_case apis .",
    );
  });

  it("only accepts real tweet permalinks as citable X/Twitter sources", () => {
    expect(
      isCitableXUrl("https://x.com/rohanpaul_ai/status/1867646111223361755"),
    ).toBe(true);
    expect(isCitableXUrl("https://x.com/i/trending/2081940657879544272")).toBe(
      false,
    );
    expect(
      isCitableXUrl(
        "https://x.com/CNASdc/article/2029218852056314162?lang=ar-x-fm",
      ),
    ).toBe(false);
  });

  it("extracts valid hostnames and rejects unsafe/invalid URLs", () => {
    expect(hostnameOf("https://www.dropbox.com/s/abc")).toBe("www.dropbox.com");
    expect(hostnameOf("https://x.com/user/status/1")).toBe("x.com");
    expect(hostnameOf("https://old.reddit.com/r/ai")).toBe("old.reddit.com");
    expect(hostnameOf("javascript:alert(1)")).toBeNull();
    expect(hostnameOf("ftp://x")).toBeNull();
    expect(hostnameOf("http://127.0.0.1/test")).toBeNull();
    expect(hostnameOf("http://localhost/test")).toBeNull();
    expect(hostnameOf("not a url")).toBeNull();
  });

  it("classifies domains accurately without false substring matches", () => {
    expect(isHost("https://www.dropbox.com/s/abc", "x.com")).toBe(false);
    expect(isHost("https://wix.com", "x.com")).toBe(false);
    expect(isHost("https://max.com", "x.com")).toBe(false);
    expect(isHost("https://box.com", "x.com")).toBe(false);
    expect(isHost("https://notreddit.com", "reddit.com")).toBe(false);
    expect(isHost("https://evil.example/?u=reddit.com", "reddit.com")).toBe(
      false,
    );

    expect(isHost("https://old.reddit.com/r/ai", "reddit.com")).toBe(true);
    expect(isHost("https://x.com/user/status/1", "x.com")).toBe(true);
    expect(isHost("https://mobile.twitter.com/user/status/1", "x.com")).toBe(
      true,
    );
    expect(isHost("https://twitter.com/user/status/1", "x.com")).toBe(true);

    expect(isHost("javascript:alert(1)", "x.com")).toBe(false);
    expect(isHost("ftp://x", "x.com")).toBe(false);
  });
});
