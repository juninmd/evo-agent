import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_KEYWORDS,
  type KeywordState,
  getSearchKeywords,
  saveSearchKeywords,
} from "../agent/search-keywords.js";

function memoryState(initial: Record<string, string> = {}): KeywordState {
  const values = new Map(Object.entries(initial));
  return {
    getState: (key) => values.get(key) ?? null,
    setState: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("search keywords", () => {
  it("uses the defaults on a fresh database", () => {
    expect(getSearchKeywords(memoryState())).toEqual(DEFAULT_SEARCH_KEYWORDS);
  });

  it("replaces a set learned under older defaults, so new defaults reach production", () => {
    // Production state written before the set was versioned: stale 2025 terms.
    const state = memoryState({
      search_keywords: '["GPT-4 tutorial","LangChain","AutoGPT"]',
    });
    expect(getSearchKeywords(state)).toEqual(DEFAULT_SEARCH_KEYWORDS);
  });

  it("keeps what the improver learned on top of the current defaults", () => {
    const state = memoryState();
    const learned = [...DEFAULT_SEARCH_KEYWORDS.slice(0, 7), "Codex cloud"];
    saveSearchKeywords(learned, state);
    expect(getSearchKeywords(state)).toEqual(learned);
  });

  it("falls back to the defaults when the stored set is corrupt or not a list", () => {
    const state = memoryState();
    saveSearchKeywords(["x"], state);
    state.setState("search_keywords", "{not json");
    expect(getSearchKeywords(state)).toEqual(DEFAULT_SEARCH_KEYWORDS);
    state.setState("search_keywords", '{"a":1}');
    expect(getSearchKeywords(state)).toEqual(DEFAULT_SEARCH_KEYWORDS);
  });
});
