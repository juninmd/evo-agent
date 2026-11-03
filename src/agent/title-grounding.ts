import { leadSentence } from "./editorial-renderer.js";
import type { EditorialDraft } from "./editorial.js";

// Function words and title verbs that paraphrase rather than quote the body.
const STOP = new Set(
  "sobre entre apenas enquanto tambem depois ainda quando contra versao novos novas nesta desta pelos pelas para como mais menos outros outras ambos todos todas porque quanto durante segundo mesmo mesma entao cada pode podem deve devem sendo foram esta estao seus suas".split(
    " ",
  ),
);
const MAX_UNSUPPORTED_SHARE = 0.45;
const MAX_TITLE = 100;

function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function stems(text: string): string[] {
  return (fold(text).match(/[a-z0-9][a-z0-9.-]{4,}/g) ?? [])
    .filter((word) => !STOP.has(word))
    .map((word) => word.slice(0, 5));
}

/**
 * Title and dek are written before the long-form pass, which can drop or
 * rewrite highlights. Returns the claims they make that the published body
 * never supports: a number absent from it, or too many unsupported words.
 */
export function ungroundedClaims(text: string, body: string): string[] {
  const folded = fold(body);
  const known = new Set(folded.match(/[a-z0-9]+/g)?.map((w) => w.slice(0, 5)));
  const numbers = (text.match(/\d[\d.,]*/g) ?? [])
    .map((n) => n.replace(/[.,]+$/, ""))
    .filter((n) => !folded.includes(n));
  const words = stems(text);
  const missing = words.filter((word) => !known.has(word));
  const share = words.length ? missing.length / words.length : 0;
  return numbers.length > 0 || share > MAX_UNSUPPORTED_SHARE
    ? [...numbers, ...missing]
    : [];
}

function joinHeadlines(headlines: string[]): string {
  let title = "";
  for (const headline of headlines) {
    const next = title ? `${title}; ${lowerFirst(headline)}` : headline;
    if (next.length > MAX_TITLE) break;
    title = next;
  }
  return title || headlines[0]?.slice(0, MAX_TITLE) || "";
}

// Headlines are sentence case; keep proper nouns/acronyms (second letter upper
// or a digit) intact when one is joined mid-title.
function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) && !/^\p{Lu}\p{Ll}+ \p{Lu}/u.test(text)
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text;
}

/**
 * Replaces a title or dek the body does not support with text built from the
 * highlights that were actually published. Headlines and leads come from the
 * rendered items, so they are grounded by construction.
 */
export function groundDraftFraming(
  draft: EditorialDraft,
  body: string,
): { draft: EditorialDraft; replaced: string[] } {
  const replaced: string[] = [];
  let { title, dek } = draft;
  if (ungroundedClaims(title, body).length > 0) {
    title = joinHeadlines(draft.highlights.map((h) => h.headline.trim()));
    replaced.push("title");
  }
  if (ungroundedClaims(dek, body).length > 0) {
    dek = draft.highlights
      .slice(0, 2)
      .map((h) => leadSentence(h.whatHappened, 220))
      .filter(Boolean)
      .join(" ");
    replaced.push("dek");
  }
  return { draft: { ...draft, title, dek }, replaced };
}
