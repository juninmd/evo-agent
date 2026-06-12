import { describe, expect, it } from "vitest";
import {
  editorialPeriod,
  isGenericTitle,
  parseEditorialDraft,
  parseEditorialJson,
  validateEditorialDraft,
} from "../agent/editorial.js";
import type { Article } from "../knowledge/store.js";

function article(date: string, url: string): Article {
  return {
    id: 1,
    title: "Claude melhora execução de tarefas longas",
    source: "Anthropic News",
    url,
    summary:
      "A Anthropic descreve melhorias de consistência em tarefas longas de codificação e fluxos agentic.",
    tags: '["claude","agents"]',
    engagement_score: 0,
    crawled_at: date,
  };
}

describe("editorial contracts", () => {
  it("uses the actual selected-source range", () => {
    expect(
      editorialPeriod([
        article("2026-06-10T12:00:00Z", "https://example.com/1"),
        article("2026-06-12T08:00:00Z", "https://example.com/2"),
      ]),
    ).toBe("10/06/2026 a 12/06/2026");
  });

  it("identifies generic titles", () => {
    expect(isGenericTitle("Notícias de Tecnologia")).toBe(true);
    expect(isGenericTitle("Desenvolvimentos recentes em IA")).toBe(true);
    expect(isGenericTitle("Avanços em Ferramentas de Desenvolvimento")).toBe(
      true,
    );
    expect(
      isGenericTitle("Claude 4.8 reforça agentes long-running e muda o custo"),
    ).toBe(false);
  });

  it("requires specific title, bounded highlights, and inline evidence", () => {
    const sources = [
      article("2026-06-12T08:00:00Z", "https://anthropic.com/news/claude"),
    ];
    const errors = validateEditorialDraft(
      {
        title: "Notícias de Tecnologia",
        dek: "Resumo genérico.",
        highlights: Array.from({ length: 9 }, (_, index) => ({
          sourceIndex: 0,
          headline: `Item ${index}`,
          whatHappened: "Algo aconteceu.",
          whyItMatters: "Isso importa.",
          evidence: "",
        })),
        synthesis: "Tendências gerais.",
      },
      sources,
      { maxHighlights: 8 },
    );

    expect(errors).toContain("title is generic");
    expect(errors).toContain("too many highlights");
    expect(errors).toContain("highlight 1 lacks grounded detail");
    expect(errors).toContain("highlight 1 lacks source evidence");
  });

  it("repairs raw control characters inside JSON strings", () => {
    const parsed = parseEditorialJson(
      '{"title":"Claude muda execução longa","dek":"Primeira linha\nSegunda linha","highlights":[],"synthesis":"Texto"}',
    );
    expect(parsed.dek).toBe("Primeira linha\nSegunda linha");
  });

  it("derives missing provenance from the selected source", () => {
    const sources = [
      article("2026-06-12T08:00:00Z", "https://anthropic.com/news/claude"),
    ];
    const draft = parseEditorialDraft(
      JSON.stringify({
        title: "Claude reforça consistência em tarefas longas",
        dek: "A atualização altera decisões de arquitetura para fluxos extensos e exige nova avaliação operacional.",
        highlights: [
          {
            sourceIndex: 0,
            headline: "Claude melhora tarefas longas",
            whatHappened:
              "A Anthropic descreveu melhorias de consistência em tarefas longas de codificação.",
            whyItMatters:
              "Equipes podem rever supervisão, retomadas e limites de execução.",
            evidence: "",
          },
        ],
        synthesis:
          "A mudança aproxima confiabilidade do desenho operacional dos agentes e oferece um critério concreto para revisar fluxos extensos.",
      }),
      sources,
      8,
    );

    expect(draft.highlights[0].evidence).toBe(sources[0].summary);
  });

  it("normalizes duplicate source selections before validation", () => {
    const sources = [
      article("2026-06-12T08:00:00Z", "https://anthropic.com/news/claude"),
    ];
    const highlight = {
      sourceIndex: 0,
      headline: "Claude melhora tarefas longas",
      whatHappened:
        "A Anthropic descreveu melhorias de consistência em tarefas longas de codificação.",
      whyItMatters:
        "Equipes podem rever supervisão, retomadas e limites de execução.",
      evidence: sources[0].summary,
    };
    const draft = parseEditorialDraft(
      JSON.stringify({
        title: "Claude reforça consistência em tarefas longas",
        dek: "A atualização altera decisões de arquitetura para fluxos extensos e exige nova avaliação operacional.",
        highlights: [highlight, highlight],
        synthesis:
          "A mudança aproxima confiabilidade do desenho operacional dos agentes e oferece um critério concreto para revisar fluxos extensos.",
      }),
      sources,
      8,
    );

    expect(draft.highlights).toHaveLength(1);
  });
});
