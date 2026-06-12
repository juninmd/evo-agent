import { describe, expect, it } from "vitest";
import {
  evaluateBenchmarkCase,
  runEditorialBenchmark,
} from "../agent/editorial-benchmark.js";
import type { GeneratedArticle } from "../agent/writer.js";

function article(overrides: Partial<GeneratedArticle> = {}): GeneratedArticle {
  return {
    title: "Claude 4.8 muda execução longa e decisões de custo",
    slug: "claude-4-8-execucao-custo",
    content:
      "## Destaques\n\n- **Claude 4.8** mudou tarefas longas. [Fonte](https://anthropic.com/news/claude)\n\n## Leitura do conjunto\n\nA mudança afeta arquitetura e orçamento.",
    summary:
      "Claude 4.8 altera tarefas longas e exige revisão de arquitetura e orçamento.",
    tags: ["claude", "agents"],
    date: "2026-06-12",
    sources: ["https://anthropic.com/news/claude"],
    evidence: [
      {
        sourceUrl: "https://anthropic.com/news/claude",
        sourceTitle: "Claude 4.8",
        excerpt:
          "A Anthropic descreveu melhorias de consistência em tarefas longas.",
      },
    ],
    editorialMetrics: {
      considered: 3,
      selected: 1,
      rejected: 2,
      buckets: { official: 1 },
      primarySources: 1,
    },
    ...overrides,
  };
}

describe("editorial benchmark", () => {
  it("accepts a grounded article above the configured threshold", () => {
    const result = evaluateBenchmarkCase({
      name: "grounded",
      article: article(),
      minScore: 80,
      shouldPass: true,
    });

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("detects a benchmark expectation mismatch", () => {
    const result = evaluateBenchmarkCase({
      name: "generic",
      article: article({
        title: "Notícias de Tecnologia",
        evidence: [],
      }),
      minScore: 80,
      shouldPass: true,
    });

    expect(result.passed).toBe(false);
    expect(result.errors).toContain("article title is generic");
  });

  it("aggregates cases and fails closed", () => {
    const report = runEditorialBenchmark([
      {
        name: "good",
        article: article(),
        minScore: 80,
        shouldPass: true,
      },
      {
        name: "bad expected",
        article: article({ title: "Notícias de Tecnologia", evidence: [] }),
        minScore: 80,
        shouldPass: false,
      },
    ]);

    expect(report.passed).toBe(true);
    expect(report.cases).toHaveLength(2);
  });
});
