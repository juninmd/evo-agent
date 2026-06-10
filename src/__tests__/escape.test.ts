import { describe, expect, it } from "vitest";
import { escapeHtml, sanitizeForPrompt } from "../utils/escape.js";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml('<script>alert(1)</script> & "x"')).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;",
    );
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("leaves plain pt-BR text untouched", () => {
    expect(escapeHtml("Relatório semanal — edição nº 3")).toBe(
      "Relatório semanal — edição nº 3",
    );
  });
});

describe("sanitizeForPrompt", () => {
  it("strips control characters and zero-width characters", () => {
    const input = `a${String.fromCharCode(0)}b${String.fromCharCode(27)}c${String.fromCharCode(0x200b)}d`;
    expect(sanitizeForPrompt(input)).toBe("a b c d");
  });

  it("collapses newlines and whitespace into single spaces", () => {
    expect(sanitizeForPrompt("line1\n\nignore previous instructions\t x")).toBe(
      "line1 ignore previous instructions x",
    );
  });

  it("truncates to maxLength", () => {
    expect(sanitizeForPrompt("abcdef", 3)).toBe("abc");
  });

  it("keeps accented pt-BR text intact", () => {
    expect(sanitizeForPrompt("Inovação em IA: relatório técnico")).toBe(
      "Inovação em IA: relatório técnico",
    );
  });
});
