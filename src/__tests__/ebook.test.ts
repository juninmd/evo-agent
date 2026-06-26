import { describe, expect, it } from "vitest";
import {
  EBOOK_TITLE,
  buildEbookUserPrompt,
  selectEbookSources,
  validateEbook,
} from "../agent/ebook.js";
import type { Article } from "../knowledge/store.js";

function article(
  title: string,
  summary: string,
  source = "Reddit Community Signals",
  tags = '["reddit","agents"]',
): Article {
  return {
    id: 1,
    title,
    source,
    url: `https://example.com/${title.toLowerCase().replace(/\s+/g, "-")}`,
    summary,
    tags,
    engagement_score: 0,
    crawled_at: "2026-06-26T10:00:00Z",
  };
}

describe("ebook generation contracts", () => {
  it("selects only sources relevant to AI-assisted development", () => {
    const selected = selectEbookSources([
      article(
        "Claude Code melhora fluxo com agentes",
        "Discussao tecnica sobre harness, MCP e contexto em IDE.",
      ),
      article(
        "Modelo de video ganha filtros novos",
        "Atualizacao visual sem relacao com desenvolvimento de software.",
        "Google News",
        '["video"]',
      ),
    ]);

    expect(selected).toHaveLength(1);
    expect(selected[0].title).toContain("Claude Code");
  });

  it("rejects catastrophic shrink during refinement", () => {
    const current = `# ${EBOOK_TITLE}\n\n${"conteudo ".repeat(1200)}`;
    const next = `# ${EBOOK_TITLE}

## Ferramentas
Curto.
## Engenharia de Prompt e Contexto
Curto.
## Fluxos de Trabalho com Agentes
Curto.
## Boas Práticas e Qualidade
Curto.`;

    expect(() => validateEbook(next, current)).toThrow(/shrank/);
  });

  it("builds a prompt that preserves the current handbook", () => {
    const prompt = buildEbookUserPrompt(
      `# ${EBOOK_TITLE}\n\n## Ferramentas\n\n- Dica existente.`,
      [
        article(
          "Codex em fluxos de revisão",
          "Fonte descreve checklist de revisão com agente e testes.",
        ),
      ],
      [],
      "2026-06-26",
    );

    expect(prompt).toContain("VERSÃO ATUAL DO HANDBOOK");
    expect(prompt).toContain("Dica existente");
    expect(prompt).toContain("Codex em fluxos");
  });
});
