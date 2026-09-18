import { escapeHtml } from "../utils/escape.js";

export interface Reading {
  tldr: string[];
  watch: string[];
}

/**
 * The reading is model output, so it is escaped first and only a closed set of
 * inline marks is turned back into HTML: bold, code and https links.
 */
export function inlineHtml(markdown: string): string {
  return escapeHtml(markdown)
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)"]+)\)/g,
      '<a href="$2" rel="noopener">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Plain text for headlines: marks and link targets stripped. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`/g, "")
    .trim();
}

export function parseReading(markdown: string): Reading {
  const reading: Reading = { tldr: [], watch: [] };
  let section: keyof Reading | null = null;
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (/^##\s*TL;DR/i.test(line)) section = "tldr";
    else if (/^##\s*O que observar/i.test(line)) section = "watch";
    else if (/^##/.test(line)) section = null;
    else if (section === "tldr" && /^\d+[.)]\s+/.test(line)) {
      reading.tldr.push(line.replace(/^\d+[.)]\s+/, ""));
    } else if (section === "watch" && /^[-*]\s+/.test(line)) {
      reading.watch.push(line.replace(/^[-*]\s+/, ""));
    }
  }
  return reading;
}
