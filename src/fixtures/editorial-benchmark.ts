import type { EditorialBenchmarkCase } from "../agent/editorial-benchmark.js";
import type { GeneratedArticle } from "../agent/types.js";

function groundedArticle(
  overrides: Partial<GeneratedArticle> = {},
): GeneratedArticle {
  return {
    title: "Claude 4.8 reforça tarefas longas e muda decisões de custo",
    slug: "claude-4-8-tarefas-longas-custo",
    content:
      "## Destaques\n\n- **Claude 4.8** reforçou tarefas longas. [Fonte](https://anthropic.com/news/claude)\n\n## Leitura do conjunto\n\nA mudança afeta arquitetura e orçamento.",
    summary:
      "Claude 4.8 reforça tarefas longas e exige revisão de arquitetura e orçamento.",
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

export const editorialBenchmarkCases: EditorialBenchmarkCase[] = [
  {
    name: "grounded-official-source",
    article: groundedArticle(),
    minScore: 80,
    shouldPass: true,
  },
  {
    name: "reject-generic-title",
    article: groundedArticle({ title: "Notícias de Tecnologia" }),
    minScore: 80,
    shouldPass: false,
  },
  {
    name: "reject-missing-provenance",
    article: groundedArticle({ evidence: [] }),
    minScore: 80,
    shouldPass: false,
  },
];
