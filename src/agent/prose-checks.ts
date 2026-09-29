import {
  EDITORIAL_CLICHES,
  hasEnglishSentence,
  hasModelArtifacts,
  hasPromptLeak,
  looksEnglish,
  looksGarbled,
} from "./editorial.js";

// The analysis prompt once named the audience with this exact phrase and the
// model echoed it into several items of one edition.
const PROMPT_AUDIENCE_ECHO =
  /para quem (desenvolve|constr[oó]i|opera)[^.]{0,40}software com (ia|intelig[eê]ncia artificial)/i;

const ENGLISH_FUNCTION_WORDS =
  /\b(the|to|of|and|for|with|is|are|an|by|on|into|from|that|this|it)\b/i;

/**
 * hasEnglishSentence needs a whole sentence; a drifted aside hides inside
 * parentheses. Product names ("Model Context Protocol") carry no function word.
 */
function hasEnglishAside(text: string): boolean {
  return [...text.matchAll(/\(([^()]{10,})\)/g)].some(([, inner]) => {
    const words = inner.trim().split(/\s+/);
    return (
      words.length >= 4 &&
      !/[à-ú]/i.test(inner) &&
      ENGLISH_FUNCTION_WORDS.test(inner)
    );
  });
}

export function proseIssues(
  text: string,
  minChars: number,
  maxChars?: number,
): string[] {
  const issues: string[] = [];
  const trimmed = text.trim();
  if (trimmed.length < minChars) {
    issues.push(
      `texto curto demais (${trimmed.length}/${minChars} caracteres)`,
    );
  }
  if (maxChars && trimmed.length > maxChars) {
    issues.push(
      `texto longo demais (${trimmed.length}/${maxChars} caracteres) — corte pela metade`,
    );
  }
  if (/^\s*[-*+]\s+/m.test(trimmed)) issues.push("contém lista com bullets");
  if (/^\s*#{1,6}\s+/m.test(trimmed)) issues.push("contém subtítulo markdown");
  if (/https?:\/\//i.test(trimmed)) issues.push("contém URL");
  if (hasModelArtifacts(trimmed)) {
    issues.push("contém token ou repetição corrompida do modelo");
  }
  if (hasPromptLeak(trimmed)) {
    issues.push("contém instrução ou comentário vazado do prompt");
  }
  if (hasEnglishSentence(trimmed) || hasEnglishAside(trimmed)) {
    issues.push("contém frase em inglês");
  }
  if (PROMPT_AUDIENCE_ECHO.test(trimmed)) {
    issues.push(
      'repete o enquadramento do prompt ("para quem ... software com IA")',
    );
  }
  if (looksGarbled(trimmed)) {
    issues.push(
      "contém texto corrompido (palavra repetida ou frase iniciada em minúscula)",
    );
  }
  const cliche = trimmed.match(EDITORIAL_CLICHES);
  if (cliche) issues.push(`usa a expressão proibida "${cliche[0]}"`);
  if (looksEnglish(trimmed, 8)) issues.push("não está em português brasileiro");
  return issues;
}

// The agenda's consequence field sometimes comes back as a bare noun phrase
// ("Migração de pipelines ..."): a heading, not a sentence a reader can use.
const NOMINAL_OPENING =
  /^\p{Lu}\p{Ll}*(ção|ções|mento|mentos|agem|agens|ência|ância|idade|eio)\b/u;

export function isNominalFragment(paragraph: string): boolean {
  const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.length === 1 && NOMINAL_OPENING.test(paragraph.trim());
}

// The model applied the community-report caveat to official release notes.
export const COMMUNITY_HEDGE =
  /(único|\bum) relato\b|\brelatos? d[ae] comunidade\b|\bsinal da comunidade\b/i;

// Bare acronyms (IA, API, CEOs, FLOPs) are vocabulary, not claims about a product.
const ACRONYM = /^[\p{Lu}\d]{2,}s?$/u;

/**
 * Capitalized names mid-sentence that no highlight mentions: the closing once
 * credited GitHub Copilot with an integration no item of the edition covered.
 */
export function unsupportedNames(text: string, corpus: string): string[] {
  const known = corpus.toLowerCase();
  const names = text
    .split(/(?<=[.!?:])\s+/)
    .flatMap((sentence) => sentence.split(/\s+/).slice(1))
    .map((word) => word.replace(/^[("“'`]+|[)"”'`.,;:!?]+$/g, ""))
    .filter(
      (word) =>
        /^\p{Lu}/u.test(word) &&
        !ACRONYM.test(word) &&
        !known.includes(word.toLowerCase()),
    );
  return [...new Set(names)];
}
