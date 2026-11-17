import { extractJsonObject } from "@juninmd/digest-kit/core";
import { sanitizeForPrompt } from "../../utils/escape.js";
import { log } from "../../utils/logger.js";
import { UNTRUSTED_MATERIAL_RULE } from "../prompt-guards.js";
import { plain } from "./render.js";
import type { ScoredItem } from "./scoring.js";
import type { Ask } from "./tutorial.js";

const MAX_LINE = 220;
const BATCH = 40;

const LINES_SYSTEM_PROMPT = [
  "Para cada item numerado, escreva UMA frase em pt-BR, com acentuação correta, dizendo",
  "o que o item é e o que o leitor consegue fazer com ele. Use só fatos do item;",
  "sem URLs, sem markdown, sem adjetivos vazios. Responda apenas JSON no formato",
  '{"1": "frase", "2": "frase"}.',
  UNTRUSTED_MATERIAL_RULE,
].join(" ");

function acceptable(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 20 &&
    value.length <= MAX_LINE * 1.5 &&
    !/https?:|`|\[|\]/.test(value)
  );
}

/**
 * One pt-BR line per card. Items the model skips or garbles keep the source
 * summary, so a bad response degrades the wording, never the edition.
 */
export async function cardLines(
  ask: Ask,
  items: ScoredItem[],
): Promise<Map<string, string>> {
  const lines = new Map<string, string>();
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    const material = batch
      .map(
        ({ article }, index) =>
          `${index + 1}. ${sanitizeForPrompt(article.title, 200)} — ${sanitizeForPrompt(article.summary, 400)}`,
      )
      .join("\n");
    try {
      const json = extractJsonObject(
        await ask(material, LINES_SYSTEM_PROMPT, { maxOutputTokens: 3000 }),
      );
      const parsed = json
        ? (JSON.parse(json) as Record<string, unknown>)
        : null;
      batch.forEach(({ article }, index) => {
        const value = parsed?.[String(index + 1)];
        if (acceptable(value)) lines.set(article.url, plain(value, MAX_LINE));
      });
    } catch (err) {
      log.warn(
        `Skill week lines fell back to summaries: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return lines;
}
