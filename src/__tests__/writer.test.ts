import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorialDraft } from "../agent/editorial.js";
import { generateArticle, renderEditorialDraft } from "../agent/writer.js";
import { type Article, db } from "../knowledge/store.js";

vi.mock("../utils/ai.js", () => ({
  ask: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
}));

function article(
  title: string,
  source: string,
  url: string,
  tags: string,
): Article {
  return {
    id: 1,
    title,
    source,
    url,
    summary:
      "Resumo técnico suficientemente detalhado para sustentar a pauta e explicar seu contexto.",
    tags,
    engagement_score: 0,
    crawled_at: "2026-06-12T10:00:00Z",
  };
}

describe("renderEditorialDraft", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders official and community sources by theme with controlled citations", () => {
    const articles = [
      article(
        "Claude melhora tarefas longas",
        "Anthropic News",
        "https://anthropic.com/news/claude",
        '["claude","agents"]',
      ),
      article(
        "Comunidade mede custo de inferência",
        "Hacker News",
        "https://news.ycombinator.com/item?id=1",
        '["inference","cost"]',
      ),
    ];
    const draft: EditorialDraft = {
      title: "Claude reforça tarefas longas enquanto custos entram no foco",
      dek: "Duas mudanças concretas alteram decisões de arquitetura e operação.",
      highlights: [
        {
          sourceIndex: 0,
          headline: "Claude ganha consistência",
          whatHappened:
            "A Anthropic descreveu melhora em tarefas longas e fluxos com agentes.",
          whyItMatters:
            "Execuções extensas podem exigir menos retomadas e supervisão manual.",
          evidence:
            "A Anthropic descreve melhorias de consistência em tarefas longas de codificação.",
        },
        {
          sourceIndex: 1,
          headline: "Custo de inferência vira pauta",
          whatHappened:
            "A discussão comparou formas práticas de medir custo de inferência.",
          whyItMatters:
            "Métricas comparáveis ajudam a evitar otimizações sem impacto financeiro.",
          evidence:
            "A discussão comparou formas práticas de medir custo de inferência.",
        },
      ],
      synthesis:
        "Confiabilidade e custo passam a ser avaliados juntos nas decisões técnicas.",
    };

    const markdown = renderEditorialDraft(draft, articles, "12/06/2026");

    expect(markdown).toContain("### Agentes e ferramentas de desenvolvimento");
    expect(markdown).toContain("### Infraestrutura e eficiência");
    expect(markdown).toContain(
      "[Fonte: Claude melhora tarefas longas](https://anthropic.com/news/claude)",
    );
    expect(markdown).not.toContain("Sem conteúdo");
  });

  it("refuses publication when the editorial LLM is unavailable", async () => {
    const now = new Date().toISOString();
    const articles = [
      article(
        "Claude melhora tarefas longas",
        "Anthropic News",
        "https://anthropic.com/news/claude",
        '["claude","agents"]',
      ),
      article(
        "GitHub endurece secret scanning",
        "The GitHub Blog",
        "https://github.blog/security/scanning",
        '["security","github"]',
      ),
      article(
        "Comunidade mede custo de inferência",
        "Hacker News",
        "https://news.ycombinator.com/item?id=1",
        '["inference","cost"]',
      ),
      article(
        "VS Code amplia agentes customizados",
        "VSCode Updates",
        "https://code.visualstudio.com/updates/agents",
        '["vscode","agents"]',
      ),
      article(
        "Reddit compara memória de agentes",
        "Reddit Community Signals",
        "https://reddit.com/r/agents/1",
        '["reddit","agents","memory"]',
      ),
    ].map((item, index) => ({
      ...item,
      id: index + 1,
      crawled_at: now,
      engagement_score: index * 10,
    }));
    vi.spyOn(db, "getArticlesSince").mockReturnValue(articles);
    vi.spyOn(db, "getState").mockReturnValue(null);

    await expect(generateArticle("daily")).rejects.toThrow(
      "Editorial drafting failed: LLM unavailable",
    );
  });
});
