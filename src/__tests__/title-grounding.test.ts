import { describe, expect, it } from "vitest";
import type { EditorialDraft } from "../agent/editorial.js";
import {
  groundDraftFraming,
  ungroundedClaims,
} from "../agent/title-grounding.js";

const body = `Ollama remove o limite de 128k tokens para Claude Code.
A versão 2.1.317 do Claude Code bloqueia a ação quando o callback de hook falha.`;

const draft = (title: string, dek: string): EditorialDraft => ({
  title,
  dek,
  synthesis: "",
  highlights: [
    {
      sourceIndex: 0,
      headline: "Ollama remove limite de 128k tokens para Claude Code",
      whatHappened: "A Ollama remove o limite de 128k tokens para Claude Code.",
      whyItMatters: "Saídas longas deixam de ser cortadas.",
      evidence: "x".repeat(40),
    },
  ],
});

describe("title grounding", () => {
  it("accepts framing supported by the body", () => {
    expect(
      ungroundedClaims(
        "Ollama remove limite de 128k tokens para Claude Code",
        body,
      ),
    ).toEqual([]);
  });

  it("flags a number the body never mentions", () => {
    expect(
      ungroundedClaims("Anthropic revela compromisso de 900 bilhões", body),
    ).toContain("900");
  });

  it("replaces ungrounded title and dek with published headlines", () => {
    const { draft: out, replaced } = groundDraftFraming(
      draft(
        "Anthropic revela compromisso de 900 bilhões de dólares",
        "Claude Code deixa senhas visíveis no processo zsh de comandos curl.",
      ),
      body,
    );
    expect(replaced).toEqual(["title", "dek"]);
    expect(out.title).toBe(
      "Ollama remove limite de 128k tokens para Claude Code",
    );
    expect(ungroundedClaims(out.dek, body)).toEqual([]);
  });

  it("leaves a grounded draft untouched", () => {
    const ok = draft(
      "Ollama remove limite de 128k tokens para Claude Code",
      "A Ollama remove o limite de 128k tokens para Claude Code, e o hook bloqueia a ação.",
    );
    expect(groundDraftFraming(ok, body)).toEqual({ draft: ok, replaced: [] });
  });
});
