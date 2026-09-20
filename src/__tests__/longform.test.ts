import { describe, expect, it, vi } from "vitest";
import type { EditorialDraft } from "../agent/editorial.js";
import { expandEdition, proseIssues } from "../agent/longform.js";
import type { Article } from "../knowledge/store.js";

const LONG = "Frase técnica concreta sobre custo, risco e operação. ".repeat(
  20,
);
// Fits inside both the analysis (380-750) and synthesis (500-1000) bounds,
// so it can stand in for a valid model response in either expansion pass.
const FITS_BOTH_BOUNDS =
  "Frase técnica concreta sobre custo, risco e operação. ".repeat(12);

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
    expect(proseIssues(`${LONG} do<unk><unk><unk> conteúdo.`, 700)).toContain(
      "contém token ou repetição corrompida do modelo",
    );
    expect(proseIssues(LONG, 100, 500).join(" ")).toContain(
      "texto longo demais",
    );
  });

  it("fills each highlight with long-form prose and expands the synthesis", async () => {
    const ask = vi.fn().mockResolvedValue(FITS_BOTH_BOUNDS);

    const expanded = await expandEdition(
      ask,
      draft(),
      [source()],
      "12/06/2026",
    );

    expect(ask).toHaveBeenCalledTimes(2);
    expect(expanded.highlights[0].analysis).toBe(FITS_BOTH_BOUNDS.trim());
    expect(expanded.synthesis).toBe(FITS_BOTH_BOUNDS.trim());
  });

  it("rejects prose that blows past the length ceiling", async () => {
    const ask = vi.fn().mockResolvedValue(LONG);

    const expanded = await expandEdition(
      ask,
      draft(),
      [source()],
      "12/06/2026",
    );

    // Both phases retry once against the same too-long response, then fall
    // back to the agenda text instead of publishing an unbounded wall of text.
    expect(ask).toHaveBeenCalledTimes(4);
    expect(expanded.highlights[0].analysis).toContain(
      "A Anthropic descreveu melhorias em tarefas longas.",
    );
    expect(expanded.synthesis).toBe("Síntese curta da pauta.");
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
