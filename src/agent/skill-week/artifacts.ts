/**
 * What makes a source teachable: code, commands and links a reader can run or
 * open. Everything here is deterministic so the gate never depends on the model.
 */

const FENCE = /```[^\n]*\n([\s\S]*?)```/g;
const URL_IN_TEXT = /https?:\/\/[^\s)<>\]"']+/g;
/** Repos, packages, docs and papers: places a claim can be checked. */
const ARTIFACT_HOST =
  /(^|\.)(github\.com|gitlab\.com|codeberg\.org|huggingface\.co|npmjs\.com|pypi\.org|crates\.io|arxiv\.org|readthedocs\.io)$/i;
/** Vendor docs by exact host: a wildcard like docs.* would admit any domain. */
const DOCS_HOSTS = new Set([
  "docs.anthropic.com",
  "code.claude.com",
  "docs.claude.com",
  "docs.github.com",
  "developers.openai.com",
  "platform.openai.com",
  "ai.google.dev",
  "modelcontextprotocol.io",
  "opencode.ai",
  "cursor.com",
  "docs.cursor.com",
]);
const COMMAND_LINE =
  /^\s*(?:\$\s+)?(?:npx|npm|pnpm|yarn|bunx?|pip|pipx|uv|uvx|brew|curl|git|docker|kubectl|claude|codex|gemini|opencode|cargo|python3?)\s+\S+/;
const INLINE_CODE = /`([^`\n]+)`/g;
const INLINE_COMMAND =
  /^(?:\/[a-z][\w-]*|--[a-z][\w-]*|(?:npx|npm|pnpm|pip|uvx?|brew|curl|git|docker|claude|codex|gemini|opencode)\s+\S+)/i;
const MEASURE =
  /\b\d+(?:[.,]\d+)?\s?(?:%|x\b|ms\b|tokens?\b|gb\b|mb\b|k\b|min\b|s\b)/i;

export function codeBlocks(markdown: string): string[] {
  return [...markdown.matchAll(FENCE)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

export function commandLines(markdown: string): string[] {
  const withoutFences = markdown.replace(FENCE, " ");
  const lines = withoutFences
    .split("\n")
    .filter((line) => COMMAND_LINE.test(line))
    .map((line) => line.trim());
  const inline = [...withoutFences.matchAll(INLINE_CODE)]
    .map((match) => match[1].trim())
    .filter((code) => INLINE_COMMAND.test(code));
  return [...new Set([...lines, ...inline])];
}

export function hasExecutable(markdown: string): boolean {
  return codeBlocks(markdown).length > 0 || commandLines(markdown).length > 0;
}

export function isMeasurable(text: string): boolean {
  return MEASURE.test(text);
}

export function artifactLinks(text: string): string[] {
  const links = new Set<string>();
  for (const match of text.matchAll(URL_IN_TEXT)) {
    const url = match[0].replace(/[.,;:]+$/, "");
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (ARTIFACT_HOST.test(host) || DOCS_HOSTS.has(host)) links.add(url);
    } catch {
      // Not a URL a reader could open either.
    }
  }
  return [...links];
}

function normalize(text: string): string {
  return text
    .replace(/^\s*\$\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Comments and bare punctuation carry no instruction a reader would execute.
function isInert(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === "" ||
    /^(#|\/\/|--\s)/.test(trimmed) ||
    /^[{}[\](),;]+$/.test(trimmed)
  );
}

/** Whole lines and inline spans of the sources: the only units code may copy. */
export function sourceUnits(sources: string[]): Set<string> {
  const units = new Set<string>();
  for (const source of sources) {
    for (const line of source.split("\n")) units.add(normalize(line));
    for (const match of source.matchAll(INLINE_CODE)) {
      units.add(normalize(match[1]));
    }
  }
  units.delete("");
  return units;
}

/**
 * True when every executable line of `code` is a whole line (or inline span)
 * of a source. Substrings do not count: "rm -rf ./" must not pass because the
 * source said "rm -rf ./build/tmp".
 */
export function isAnchored(code: string, sources: string[]): boolean {
  const units = sourceUnits(sources);
  return code
    .split("\n")
    .filter((line) => !isInert(line))
    .every((line) => units.has(normalize(line)));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * An inline span may name a file or flag mid-sentence, so it may sit inside a
 * source line, but only between boundaries: a cut command never matches.
 */
export function isSpanAnchored(span: string, sources: string[]): boolean {
  const needle = normalize(span);
  if (!needle) return true;
  if (sourceUnits(sources).has(needle)) return true;
  const bounded = new RegExp(
    `(^|[^\\w./-])${escapeRegExp(needle)}(?=$|[^\\w./-])`,
  );
  return sources.some((source) => bounded.test(normalize(source)));
}

/** Every inline code span, not only the ones that look like commands. */
export function inlineSpans(markdown: string): string[] {
  return [...markdown.replace(FENCE, " ").matchAll(INLINE_CODE)].map((match) =>
    match[1].trim(),
  );
}

/**
 * The first runnable snippet of a source, short enough for a card. A block
 * only counts when it holds a command: READMEs open with diagrams and prose.
 */
export function firstSnippet(markdown: string, maxLines = 8): string | null {
  const block = codeBlocks(markdown).find((code) =>
    code.split("\n").some((line) => COMMAND_LINE.test(line)),
  );
  if (block) return block.split("\n").slice(0, maxLines).join("\n");
  return commandLines(markdown)[0] ?? null;
}
