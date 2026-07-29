import { describe, expect, it } from "vitest";
import {
  editorialQualityScore,
  validateArticle,
} from "../agent/article-validation.js";
import type { GeneratedArticle } from "../agent/writer.js";

function generated(
  overrides: Partial<GeneratedArticle> = {},
): GeneratedArticle {
  return {
    title: "Panorama de agentes de IA",
    slug: "panorama-agentes-ia",
    content: `## Destaques\n\n### Agentes mudam a operação\n\n${"Conteúdo editorial válido que descreve a mudança técnica e o que ela altera na operação. ".repeat(
      26,
    )}\n\n[Fonte](https://example.com)\n\n## Fontes e Referências\n\n1. [Fonte](https://example.com)`,
    summary: "Resumo editorial válido e suficientemente descritivo.",
    tags: ["ai", "agents"],
    date: "2026-06-12",
    sources: ["https://example.com"],
    evidence: [
      {
        sourceUrl: "https://example.com",
        sourceTitle: "Fonte",
        excerpt:
          "A fonte descreve uma mudança técnica concreta usada pelo destaque.",
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

describe("validateArticle", () => {
  it("accepts a complete article", () => {
    expect(validateArticle(generated())).toEqual([]);
  });

  it("rejects a missing primary source when one was available", () => {
    const errors = validateArticle(
      generated({
        editorialMetrics: {
          considered: 3,
          selected: 1,
          rejected: 2,
          buckets: { community: 1 },
          primarySources: 0,
          primaryCandidates: 2,
        },
      }),
    );

    expect(errors).toContain("article has no primary source");
  });

  it("accepts a missing primary source when none was available", () => {
    const metrics = {
      considered: 3,
      selected: 1,
      rejected: 2,
      buckets: { community: 1 },
      primarySources: 0,
      primaryCandidates: 0,
    };

    // Upstream rate limits left only community signals; the article is not
    // defective for it, and must not fail the cycle or trigger a rollback.
    expect(validateArticle(generated({ editorialMetrics: metrics }))).toEqual(
      [],
    );
    expect(
      editorialQualityScore(generated({ editorialMetrics: metrics })),
    ).toBe(100);
  });

  it("stays strict when primary-source availability is unknown", () => {
    const errors = validateArticle(
      generated({
        editorialMetrics: {
          considered: 3,
          selected: 1,
          rejected: 2,
          buckets: { community: 1 },
          primarySources: 0,
        },
      }),
    );

    expect(errors).toContain("article has no primary source");
  });

  it("rejects empty sources, unsafe links, and invalid Mermaid", () => {
    const errors = validateArticle(
      generated({
        sources: [],
        content:
          "## Tendências\n\n[ruim](javascript:alert(1))\n\n```mermaid\ngraph XX\nA --> B\n```",
      }),
    );

    expect(errors).toContain("article has no selected sources");
    expect(errors).toContain("article contains an unsafe link");
    expect(errors).toContain("article contains an invalid Mermaid direction");
  });

  it("rejects generic titles, placeholders, and uncited highlights", () => {
    const errors = validateArticle(
      generated({
        title: "Notícias de Tecnologia",
        content:
          "## Destaques\n\n- **Item genérico** — Sem conteúdo\n\n## Tendências\n\nTexto sem evidência.",
      }),
    );

    expect(errors).toContain("article title is generic");
    expect(errors).toContain("article contains placeholder content");
    expect(errors).toContain("article highlights lack inline citations");
    expect(
      editorialQualityScore(
        generated({
          title: "Notícias de Tecnologia",
          content: "## Destaques\n\nSem conteúdo",
        }),
      ),
    ).toBeLessThan(70);
  });

  it("rejects missing or unrelated evidence provenance", () => {
    expect(validateArticle(generated({ evidence: [] }))).toContain(
      "article has no evidence provenance",
    );
    expect(
      validateArticle(
        generated({
          evidence: [
            {
              sourceUrl: "https://other.example/evidence",
              sourceTitle: "Outra fonte",
              excerpt: "Trecho não associado às fontes selecionadas.",
            },
          ],
        }),
      ),
    ).toContain("article evidence references an unselected source");
  });
});
