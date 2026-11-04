import { describe, expect, it } from "vitest";
import { validateArticle } from "../agent/article-validation.js";
import {
  buildEditorialPrompt,
  isGenericImpact,
  pruneLowUtility,
  ungroundedHeadlineTerms,
} from "../agent/editorial.js";
import type { EditorialDraft } from "../agent/editorial.js";
import { editorialBenchmarkCases } from "../fixtures/editorial-benchmark.js";
import type { Article } from "../knowledge/store.js";

const source: Article = {
  id: 1,
  title: "v2.1.317",
  source: "Claude Code Releases",
  url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.317",
  summary:
    "Agent SDK hook callbacks accept onFailure block in Claude Code 2.1.317.",
  tags: "[]",
  engagement_score: 0,
  crawled_at: "2026-11-03T00:00:00Z",
};

describe("headline grounding", () => {
  it("flags numbers and mid-headline names the source lacks", () => {
    expect(
      ungroundedHeadlineTerms(
        "Claude Code bloqueia ação com 900 callbacks no Copilot",
        source,
      ),
    ).toEqual(expect.arrayContaining(["900", "Copilot"]));
  });

  it("accepts a headline built from the source", () => {
    expect(
      ungroundedHeadlineTerms(
        "Claude Code 2.1.317 bloqueia ação quando hook falha",
        source,
      ),
    ).toEqual([]);
  });
});

describe("generic impact", () => {
  it("rejects advice without a concrete object", () => {
    expect(
      isGenericImpact("Empresas devem atualizar canais de divulgação."),
    ).toBe(true);
  });
  it("accepts advice naming a flag or version", () => {
    expect(
      isGenericImpact("Equipes devem revisar `onFailure` antes da 2.1.317."),
    ).toBe(false);
  });
});

describe("utility pruning", () => {
  const highlight = (utility: number, i: number) => ({
    sourceIndex: i,
    headline: `h${i}`,
    whatHappened: "x".repeat(50),
    whyItMatters: "y".repeat(40),
    evidence: "z".repeat(40),
    utility,
  });

  it("keeps the draft when pruning would break the quotas", () => {
    const draft: EditorialDraft = {
      title: "t".repeat(30),
      dek: "d".repeat(60),
      synthesis: "s".repeat(90),
      highlights: [highlight(1, 0), highlight(5, 1)],
    };
    // Fewer than 5 highlights remain valid only when sources are fewer.
    const sources = [
      source,
      { ...source, url: "https://a.b/c" },
      source,
      source,
      source,
    ];
    expect(pruneLowUtility(draft, sources, 8)).toBe(draft);
  });
});

describe("prompt rules", () => {
  it("lists sources that repeat recent coverage", () => {
    const prompt = buildEditorialPrompt(
      [source],
      "03/11/2026",
      8,
      new Map([[0, "LiteLLM assina imagens"]]),
    );
    expect(prompt).toContain("já coberta por «LiteLLM assina imagens»");
    expect(prompt).toContain("utility");
  });
});

describe("article validation", () => {
  it("rejects a title number the body never mentions", () => {
    const base = editorialBenchmarkCases[0].article;
    expect(
      validateArticle({ ...base, title: `${base.title} 900 bilhões` }),
    ).toContain("article title cites a number absent from its body");
  });
});
