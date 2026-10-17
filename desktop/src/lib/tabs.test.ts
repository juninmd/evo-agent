import { describe, expect, it } from "vitest";
import {
  TABS,
  type TabId,
  isTabId,
  nextTabIndex,
  panelId,
  tabId,
} from "./tabs";

const EXPECTED: TabId[] = [
  "overview",
  "editions",
  "sources",
  "cycles",
  "prompts",
  "metrics",
  "settings",
];

describe("tabs", () => {
  it("declares every section exactly once, in order", () => {
    expect(TABS.map((tab) => tab.id)).toEqual(EXPECTED);
    expect(new Set(TABS.map((tab) => tab.id)).size).toBe(TABS.length);
    for (const tab of TABS) {
      expect(tab.label.length).toBeGreaterThan(0);
    }
  });

  it("guards an unknown id", () => {
    expect(isTabId("editions")).toBe(true);
    expect(isTabId("nope")).toBe(false);
    expect(isTabId("")).toBe(false);
  });

  it("builds stable ids for the ARIA wiring", () => {
    expect(tabId("overview")).toBe("aba-overview");
    expect(panelId("overview")).toBe("painel-overview");
  });

  it("moves with arrows, Home and End, wrapping at both ends", () => {
    expect(nextTabIndex("overview", "ArrowRight")).toBe(1);
    expect(nextTabIndex("settings", "ArrowRight")).toBe(0);
    expect(nextTabIndex("overview", "ArrowLeft")).toBe(EXPECTED.length - 1);
    expect(nextTabIndex("metrics", "Home")).toBe(0);
    expect(nextTabIndex("overview", "End")).toBe(EXPECTED.length - 1);
    expect(nextTabIndex("overview", "Enter")).toBeNull();
  });
});
