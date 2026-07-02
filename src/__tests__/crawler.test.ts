import { describe, expect, it } from "vitest";
import {
  hackerNewsEngagement,
  isUsefulComment,
  parseGitHubStarCount,
  redditRateLimitDelayMs,
  summarizeSourceContent,
} from "../crawler/index.js";

describe("crawler transformations", () => {
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
