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

  it("rejects leaked prompt text, drifted English sentences and garbled prose", () => {
    expect(
      proseIssues(`${FITS_BOTH_BOUNDS} Verifiquei tudo. Pronto.`, 100).join(
        " ",
      ),
    ).toContain("vazad");
    expect(
      proseIssues(
        `${FITS_BOTH_BOUNDS} A correção reinicia a rodada or any other content due to its size.`,
        100,
      ),
    ).toContain("contém frase em inglês");
    expect(
      proseIssues(
        `${FITS_BOTH_BOUNDS} O plano custa cem cento cento reais. o relato segue. a conta esgota.`,
        100,
      ).join(" "),
    ).toContain("texto corrompido");
  });

  it("accepts legitimate pt-BR tech prose that names LLM concepts", () => {
    const prose =
      'A API permite configurar stop sequences e o agente gera helper functions reutilizáveis. A Meta lança o Llama como modelo de linguagem aberto, com técnicas de self-correction. O plano custa R$ 1.300 e a versão v0.0.85 corrige o Cline, segundo o post "I\'m afraid to use Opus 5".';
    expect(proseIssues(prose, 0)).toEqual([]);
  });

  it("rejects an English aside hidden in parentheses", () => {
    expect(
      proseIssues(
        "A discussão compara a natureza efêmera de agentes (summoned to complete a single task) ao personagem da série.",
        0,
      ).join(" "),
    ).toContain("inglês");
    // Product names and acronyms in parentheses are not a language drift.
    expect(
      proseIssues(
        "O protocolo (Model Context Protocol) e o modo (Adaptive Reasoning, Max Effort) seguem estáveis.",
        0,
      ),
    ).toEqual([]);
  });

  // The analysis prompt said "para quem constrói e opera software com IA"
  // and the model pasted it into three items of the same edition.
  it("rejects prose that echoes the prompt's audience framing", () => {
    expect(
      proseIssues(
        "Para quem desenvolve e opera software com IA, a mudança reduz retrabalho.",
        0,
      ).join(" "),
    ).toContain("enquadramento");
  });

  it("closes every fallback paragraph as a full sentence", async () => {
    const ask = vi.fn().mockRejectedValue(new Error("LLM unavailable"));
    const telegraphic = draft();
    telegraphic.highlights[0] = {
      ...telegraphic.highlights[0],
      whatHappened: "Usuários reportam loop de autenticação na extensão",
      whyItMatters: "Quem depende da extensão fica sem operar",
    };

    const expanded = await expandEdition(
      ask,
      telegraphic,
      [source()],
      "12/06/2026",
    );

    expect(expanded.highlights[0].analysis).toBe(
      "Usuários reportam loop de autenticação na extensão.\n\nQuem depende da extensão fica sem operar.",
    );
  });

  it("publishes only the fact when the fallback consequence is a bare noun phrase", async () => {
    const ask = vi.fn().mockRejectedValue(new Error("LLM unavailable"));
    const fragments = draft();
    fragments.highlights[0] = {
      ...fragments.highlights[0],
      whatHappened: "O Ollama passou a expor modelos de decisão.",
      whyItMatters:
        "Migração de pipelines de classificação para modelos determinísticos.",
    };

    const expanded = await expandEdition(
      ask,
      fragments,
      [source()],
      "12/06/2026",
    );

    // A heading-like fragment reads as a broken edition, not as analysis; the
    // item itself stays so editorial floors checked before expansion still hold.
    expect(expanded.highlights[0].analysis).toBe(
      "O Ollama passou a expor modelos de decisão.",
    );
  });

  it("tells the model a primary source is official and rejects calling it a community report", async () => {
    const hedged = `${FITS_BOTH_BOUNDS}A evidência baseia-se apenas em um único relato da comunidade.`;
    const ask = vi
      .fn()
      .mockResolvedValueOnce(hedged)
      .mockResolvedValue(FITS_BOTH_BOUNDS);

    const expanded = await expandEdition(
      ask,
      draft(),
      [source()],
      "12/06/2026",
    );

    expect(ask.mock.calls[0][0]).toContain("TIPO DE FONTE: fonte primária");
    expect(ask.mock.calls[1][0]).toContain("fonte primária como relato");
    expect(expanded.highlights[0].analysis).toBe(FITS_BOTH_BOUNDS.trim());
  });

  it("rewrites a synthesis that names a product no highlight covers", async () => {
    const drifted = `${FITS_BOTH_BOUNDS}A integração chega ao GitHub Copilot e ao Claude Code.`;
    const ask = vi
      .fn()
      .mockResolvedValueOnce(FITS_BOTH_BOUNDS)
      .mockResolvedValueOnce(drifted)
      .mockResolvedValue(FITS_BOTH_BOUNDS);

    const expanded = await expandEdition(
      ask,
      draft(),
      [source()],
      "12/06/2026",
    );

    expect(ask.mock.calls[2][0]).toContain("GitHub, Copilot");
    expect(expanded.synthesis).toBe(FITS_BOTH_BOUNDS.trim());
  });

  it("keeps the report framing for community signals", async () => {
    const hedged = `${FITS_BOTH_BOUNDS}A evidência é um único relato da comunidade.`;
    const ask = vi.fn().mockResolvedValue(hedged);
    const community = {
      ...source(),
      source: "Reddit r/ClaudeCode",
      url: "https://www.reddit.com/r/ClaudeCode/comments/x/post/",
    };

    const expanded = await expandEdition(
      ask,
      draft(),
      [community],
      "12/06/2026",
    );

    expect(ask.mock.calls[0][0]).toContain(
      "TIPO DE FONTE: sinal da comunidade",
    );
    expect(expanded.highlights[0].analysis).toBe(hedged);
  });

  it("drops a highlight and the synthesis when only corrupted fallback text is left", async () => {
    const ask = vi.fn().mockRejectedValue(new Error("LLM unavailable"));
    const corrupted = draft();
    corrupted.highlights.push({
      sourceIndex: 1,
      headline: "Pauta corrompida",
      whatHappened:
        "O relato indica esgotamento da conta. o uso segue alto. a cota some.",
      whyItMatters: "Equipes perdem previsibilidade de custo.",
      evidence: source().summary,
    });
    corrupted.synthesis =
      "Leitura conjunta das pautas. Write the technical content. Verifiquei tudo.";

    const expanded = await expandEdition(
      ask,
      corrupted,
      [source(), { ...source(), id: 2, url: "https://example.com/2" }],
      "12/06/2026",
    );

    expect(expanded.highlights.map((h) => h.headline)).toEqual([
      "Claude ganha consistência",
    ]);
    expect(expanded.synthesis).toBe("");
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
