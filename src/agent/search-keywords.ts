import { db } from "../knowledge/store.js";

export type KeywordState = Pick<typeof db, "getState" | "setState">;

const KEYWORDS_KEY = "search_keywords";
const VERSION_KEY = "search_keywords_version";
// Bump when the defaults change: sets learned under older defaults are dropped once.
const KEYWORDS_VERSION = "2026-09";

// mergeKeywords pins the first 7 forever, so the head carries the highest signal.
export const DEFAULT_SEARCH_KEYWORDS = [
  "Claude Code",
  "OpenAI Codex",
  "GitHub Copilot agent",
  "AI coding agent",
  "Model Context Protocol",
  "Gemini CLI",
  "Cursor AI editor",
  // Models and vendors
  "Anthropic Claude model",
  "OpenAI GPT model release",
  "Google Gemini model",
  "open-weight model release",
  "Qwen DeepSeek model",
  // Engineering practice
  "LLM evals",
  "prompt injection agent security",
  "LLM inference cost",
  "AI agent observability",
  "RAG in production",
  "vLLM Ollama local inference",
  // Market and policy
  "AI developer productivity study",
  "AI regulation",
];

export function getSearchKeywords(state: KeywordState = db): string[] {
  if (state.getState(VERSION_KEY) !== KEYWORDS_VERSION) {
    return DEFAULT_SEARCH_KEYWORDS;
  }
  try {
    const parsed: unknown = JSON.parse(state.getState(KEYWORDS_KEY) ?? "");
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.filter(
          (keyword): keyword is string => typeof keyword === "string",
        )
      : DEFAULT_SEARCH_KEYWORDS;
  } catch {
    return DEFAULT_SEARCH_KEYWORDS;
  }
}

export function saveSearchKeywords(
  keywords: string[],
  state: KeywordState = db,
): void {
  state.setState(KEYWORDS_KEY, JSON.stringify(keywords));
  state.setState(VERSION_KEY, KEYWORDS_VERSION);
}
