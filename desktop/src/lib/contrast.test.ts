import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, luminance } from "./contrast";

const css = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");

/** Os tokens `--color-*` declarados no bloco de uma pele. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`pele ausente em styles.css: ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(
      (match) => [match[1], match[2]],
    ),
  );
}

const SKINS = {
  escuro: tokens(':root[data-skin="escuro"]'),
  claro: tokens(':root[data-skin="claro"]'),
};

const TEXT = [
  "fg",
  "muted",
  "faint",
  "accent-text",
  "danger",
  "ok",
  "warn",
  "info",
];

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(luminance("#ffffff")).toBe(1);
    expect(() => luminance("red")).toThrow();
  });
});

// A interface usa texto de 11-12 px: vale o limite de texto normal (4,5:1),
// nao o de texto grande.
describe.each(Object.entries(SKINS))("tema %s", (_name, skin) => {
  it.each(TEXT)("texto %s passa AA sobre o painel e sobre o fundo", (token) => {
    expect(contrastRatio(skin[token], skin.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(skin[token], skin.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it("o texto sobre o destaque passa AA", () => {
    expect(
      contrastRatio(skin["on-accent"], skin.accent),
    ).toBeGreaterThanOrEqual(4.5);
  });

  // WCAG 1.4.11: traco de grafico, marcador e borda de foco sao componentes
  // graficos, com limite de 3:1 contra a superficie.
  it.each(["accent", "line", "danger", "ok", "warn", "info"])(
    "a marca %s se distingue do painel",
    (token) => {
      expect(contrastRatio(skin[token], skin.panel)).toBeGreaterThanOrEqual(3);
    },
  );
});
