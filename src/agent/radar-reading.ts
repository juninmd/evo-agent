const MIN_TLDR_ITEMS = 5;

/**
 * Reasoning models behind LiteLLM leak their scratchpad into the text; the
 * edition is whatever follows the last TL;DR heading, or nothing.
 */
export function extractReading(text: string): string | null {
  // Past the first <unk> the model has degenerated; the line it was on is lost.
  const broken = text.indexOf("<unk>");
  const intact =
    broken < 0
      ? text
      : text.slice(0, Math.max(0, text.lastIndexOf("\n", broken)));
  const start = intact.lastIndexOf("## TL;DR");
  if (start < 0) return null;
  const reading = intact.slice(start).trim();
  const items = reading.match(/^\s*\d+\.\s+\S/gm)?.length ?? 0;
  return items >= MIN_TLDR_ITEMS && readsAsPortuguese(reading) ? reading : null;
}

/** The proxy's model drifts to English despite the prompt; function words tell. */
function readsAsPortuguese(text: string): boolean {
  const count = (pattern: RegExp) => text.match(pattern)?.length ?? 0;
  const portuguese = count(
    /\b(de|do|da|dos|das|para|com|que|em|no|na|os|um|uma|por|ao)\b/gi,
  );
  const english = count(
    /\b(the|and|with|for|to|of|in|is|are|now|from|this|that)\b/gi,
  );
  return portuguese >= english;
}
