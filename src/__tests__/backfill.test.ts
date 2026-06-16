import { describe, expect, it } from "vitest";
import {
  asRetroactiveArticle,
  historicalDates,
  parseBackfillCheckpoint,
} from "../agent/backfill.js";
import type { GeneratedArticle } from "../agent/types.js";

function generatedArticle(): GeneratedArticle {
  return {
    title: "Claude muda execução de agentes",
    slug: "claude-muda-execucao-de-agentes",
    content:
      "## Destaques\n\n[Fonte](https://example.com/source)\n\n## Fontes e Referências",
    summary: "Resumo histórico suficientemente completo para publicação.",
    tags: ["agents"],
    date: "2026-06-12",
    sources: ["https://example.com/source"],
    evidence: [
      {
        sourceUrl: "https://example.com/source",
        sourceTitle: "Fonte",
        excerpt: "Trecho factual suficientemente detalhado para auditoria.",
      },
    ],
    editorialMetrics: {
      considered: 4,
      selected: 1,
      rejected: 3,
      buckets: { official: 1 },
      primarySources: 1,
    },
  };
}

describe("article backfill", () => {
  it("builds an inclusive UTC date range", () => {
    expect(historicalDates("2026-06-01", "2026-06-03")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("creates a unique historical slug and tag", () => {
    const article = generatedArticle();

    const result = asRetroactiveArticle(article, "2026-06-01");
    expect(result.slug).toContain("retroativo-2026-06-01-");
    expect(result.tags).toContain("retroativo");
    expect(result.date).toBe("2026-06-01");
  });

  it("reuses only valid generation checkpoints", () => {
    const article = generatedArticle();

    expect(
      parseBackfillCheckpoint(JSON.stringify(article), "2026-06-01"),
    ).toMatchObject({
      date: "2026-06-01",
      slug: `retroativo-2026-06-01-${article.slug}`,
    });
    expect(parseBackfillCheckpoint("{invalid", "2026-06-01")).toBeNull();
  });
});
