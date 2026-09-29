const MODEL_NAME =
  /\b(claude|gpt|gemini|llama|qwen|deepseek|grok|mistral|glm|kimi|minimax|muse)[\s-]+((?:opus|sonnet|haiku|fable|v)?[\s-]*\d+(?:\.\d+)*)(?!\w|\.\d)(?:[\s-]+(astra|sol|luna|pro|max|flash|lite|mini|nano|turbo|codex|coder|omni|ultra)\b)?/i;

/**
 * "Claude Sonnet 5.5" in a launch listing and in a community repost of the
 * announcement share almost no other title words, so lexical similarity never
 * merged them and one launch filled two items of the same edition.
 */
export function modelKey(title: string): string | null {
  const match = title.match(MODEL_NAME);
  if (!match) return null;
  return match
    .slice(1)
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[\s-]+/g, " ")
    .trim();
}
