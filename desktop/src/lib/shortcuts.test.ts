import { describe, expect, it } from "vitest";
import { isTypingTarget, shortcutFor } from "./shortcuts";

describe("shortcutFor", () => {
  it("maps a digit to the tab in that position", () => {
    expect(shortcutFor({ key: "1" }, null)).toEqual({
      kind: "tab",
      tab: "overview",
    });
    expect(shortcutFor({ key: "4" }, null)).toEqual({
      kind: "tab",
      tab: "cycles",
    });
    expect(shortcutFor({ key: "7" }, null)).toEqual({
      kind: "tab",
      tab: "settings",
    });
    expect(shortcutFor({ key: "8" }, null)).toBeNull();
  });

  it("refreshes on r", () => {
    expect(shortcutFor({ key: "r" }, null)).toEqual({ kind: "refresh" });
    expect(shortcutFor({ key: "R" }, null)).toEqual({ kind: "refresh" });
  });

  it("leaves modified keys to the system and typing to the field", () => {
    expect(shortcutFor({ key: "r", ctrlKey: true }, null)).toBeNull();
    expect(shortcutFor({ key: "1", metaKey: true }, null)).toBeNull();
    expect(shortcutFor({ key: "2", altKey: true }, null)).toBeNull();
    expect(shortcutFor({ key: "2" }, { tagName: "INPUT" })).toBeNull();
    expect(shortcutFor({ key: "r" }, { tagName: "select" })).toBeNull();
    expect(shortcutFor({ key: "x" }, null)).toBeNull();
  });
});

describe("isTypingTarget", () => {
  it("recognises form fields and editable regions", () => {
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(
      true,
    );
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
