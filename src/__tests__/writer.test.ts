import { afterEach, describe, expect, it, vi } from "vitest";
import { articlesFromDraft } from "../agent/editorial-renderer.js";
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
    expect(articlesFromDraft(draft, articles)).toEqual(articles);
  });

  it("keeps selected sources whose URL contains markdown punctuation", () => {
    const selected = article(
      "Release oficial",
      "The GitHub Blog",
      "https://github.blog/changelog/feature_(preview)",
      '["github"]',
    );
    const draft: EditorialDraft = {
      title: "GitHub publica nova versão de recurso em preview",
      dek: "A mudança altera decisões concretas de adoção para equipes que usam o recurso.",
      highlights: [
        {
          sourceIndex: 0,
          headline: "Recurso entra em nova fase",
          whatHappened:
            "O GitHub publicou uma atualização oficial para o recurso em preview.",
          whyItMatters:
            "Equipes podem revisar critérios de adoção e integração.",
          evidence:
            "Resumo técnico suficientemente detalhado para sustentar a pauta e explicar seu contexto.",
        },
      ],
      synthesis:
        "A atualização fornece evidência oficial para revisar a adoção do recurso.",
    };

    expect(articlesFromDraft(draft, [selected])).toEqual([selected]);
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

  it("uses a bounded historical window for retroactive editions", async () => {
    const articles = Array.from({ length: 5 }, (_, index) => ({
      ...article(
        `Fonte histórica ${index}`,
        index < 2 ? "The GitHub Blog" : "Hacker News",
        `https://example.com/history-${index}`,
        '["history","agents"]',
      ),
      id: index + 1,
      crawled_at: `2026-06-0${8 + Math.min(index, 1)}T10:00:00Z`,
      engagement_score: 100 - index,
    }));
    const between = vi
      .spyOn(db, "getArticlesBetween")
      .mockReturnValue(articles);
    vi.spyOn(db, "getState").mockReturnValue(null);

    await expect(
      generateArticle("daily", { targetDate: "2026-06-09" }),
    ).rejects.toThrow("Editorial drafting failed: LLM unavailable");

    expect(between).toHaveBeenCalledWith(
      "2026-06-08T00:00:00.000Z",
      "2026-06-10T00:00:00.000Z",
      240,
    );
  });

  it("expands only backward when the daily window has no primary source", async () => {
    const titles = [
      "Agentes locais recebem nova avaliação",
      "Custos de inferência entram no debate",
      "Memória vetorial ganha benchmark",
      "Ferramentas MCP mudam integração",
      "Observabilidade de prompts avança",
    ];
    const sources = [
      "Hacker News",
      "TabNews",
      "Reddit Community Signals",
      "Google News",
      "GitHub Trending",
    ];
    const community = titles.map((title, index) => ({
      ...article(
        title,
        sources[index],
        `https://example.com/community-${index}`,
        '["history","agents"]',
      ),
      id: index + 1,
      crawled_at: "2026-06-09T10:00:00Z",
      engagement_score: 100 - index,
    }));
    const expanded = [
      ...community,
      {
        ...article(
          "Release oficial histórica",
          "The GitHub Blog",
          "https://github.blog/history",
          '["history","agents"]',
        ),
        id: 10,
        crawled_at: "2026-06-05T10:00:00Z",
        engagement_score: 90,
      },
    ];
    const between = vi
      .spyOn(db, "getArticlesBetween")
      .mockReturnValueOnce(community);
    const official = expanded.at(-1);
    expect(official).toBeDefined();
    const primaryBetween = vi
      .spyOn(db, "getPrimaryArticlesBetween")
      .mockReturnValue(official ? [official] : []);
    vi.spyOn(db, "getState").mockReturnValue(null);

    await expect(
      generateArticle("daily", { targetDate: "2026-06-09" }),
    ).rejects.toThrow("Editorial drafting failed: LLM unavailable");

    expect(between).toHaveBeenCalledTimes(1);
    expect(primaryBetween).toHaveBeenCalledWith(
      "2026-06-02T00:00:00.000Z",
      "2026-06-10T00:00:00.000Z",
      50,
    );
  });
});
