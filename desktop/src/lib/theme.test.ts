import { describe, expect, it } from "vitest";
import { isThemeId, nextTheme, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("keeps an explicit theme", () => {
    expect(resolveTheme("escuro", true)).toBe("escuro");
    expect(resolveTheme("claro", false)).toBe("claro");
  });

  it("maps 'sistema' to the OS preference", () => {
    expect(resolveTheme("sistema", true)).toBe("claro");
    expect(resolveTheme("sistema", false)).toBe("escuro");
  });
});

describe("nextTheme", () => {
  it("cycles through the three options", () => {
    expect(nextTheme("escuro")).toBe("claro");
    expect(nextTheme("claro")).toBe("sistema");
    expect(nextTheme("sistema")).toBe("escuro");
  });
});

describe("isThemeId", () => {
  it("rejects anything the storage could hold", () => {
    expect(isThemeId("claro")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});
