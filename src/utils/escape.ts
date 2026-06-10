const PROMPT_UNSAFE_CHARS =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029]/g;

export function sanitizeForPrompt(value: string, maxLength = 500): string {
  return value
    .replace(PROMPT_UNSAFE_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
