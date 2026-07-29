import { describe, expect, it, vi } from "vitest";
import type { EditorialDraft } from "../agent/editorial.js";
import { expandEdition, proseIssues } from "../agent/longform.js";
import type { Article } from "../knowledge/store.js";

const LONG = "Frase técnica concreta sobre custo, risco e operação. ".repeat(
  20,
);

function source(): Article {
  return {
    id: 1,
    title: "Claude melhora tarefas longas",
    source: "Anthropic News",
    url: "https://anthropic.com/news/claude",
    summary:
      "A Anthropic descreve melhorias de consistência em tarefas longas de codificação.",
    tags: '["claude","agents"]',
    engagement_score: 0,
    crawled_at: "2026-06-12T10:00:00Z",
  };
}

function draft(): EditorialDraft {
  return {
    title: "Claude reforça consistência em tarefas longas",
    dek: "A atualização altera decisões de arquitetura para fluxos extensos.",
    highlights: [
      {
        sourceIndex: 0,
        headline: "Claude ganha consistência",
        whatHappened: "A Anthropic descreveu melhorias em tarefas longas.",
        whyItMatters: "Equipes revisam supervisão, retomadas e limites.",
        evidence: source().summary,
      },
    ],
    synthesis: "Síntese curta da pauta.",
  };
}

describe("long-form editorial pass", () => {
  it("rejects templated, bulleted, short or linked prose", () => {
    expect(proseIssues(LONG, 700)).toEqual([]);
    expect(proseIssues("texto curto", 700)).toContain(
      "texto curto demais (11/700 caracteres)",
    );
    expect(proseIssues(`- item\n${LONG}`, 700)).toContain(
      "contém lista com bullets",
    );
    expect(proseIssues(`## Título\n${LONG}`, 700)).toContain(
      "contém subtítulo markdown",
    );
    expect(proseIssues(`${LONG} https://exemplo.com`, 700)).toContain(
      "contém URL",
    );
    expect(
      proseIssues(`${LONG} Por que importa: nada.`, 700).join(" "),
    ).toContain('usa a expressão proibida "Por que importa"');
    expect(
      proseIssues(
        "The release shows how the new agent is able to take the first step and this is why the team from the platform will show that it is new.".repeat(
          6,
        ),
        700,
      ),
    ).toContain("não está em português brasileiro");
  });

  it("fills each highlight with long-form prose and expands the synthesis", async () => {
    const ask = vi.fn().mockResolvedValue(LONG);

    const expanded = await expandEdition(
      ask,
      draft(),
      [source()],
      "12/06/2026",
    );

    expect(ask).toHaveBeenCalledTimes(2);
    expect(expanded.highlights[0].analysis).toBe(LONG.trim());
    expect(expanded.synthesis).toBe(LONG.trim());
  });

  it("keeps the agenda text when the expansion pass cannot deliver", async () => {
    const ask = vi.fn().mockRejectedValue(new Error("LLM unavailable"));

    const expanded = await expandEdition(
      ask,
      draft(),
      [source()],
      "12/06/2026",
    );

    expect(expanded.highlights[0].analysis).toContain(
      "A Anthropic descreveu melhorias em tarefas longas.",
    );
    expect(expanded.synthesis).toBe("Síntese curta da pauta.");
  });
});
