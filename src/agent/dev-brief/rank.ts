/** What the brief ranks and prints; built from crawler rows, catalog cards or star history. */
export type Section = "breaking" | "claude" | "models" | "repos" | "tools";

export interface BriefItem {
  section: Section;
  title: string;
  url: string;
  /** One plain line: what changed and why it matters. */
  line: string;
  source: string;
  /** Pasteable command, when the source has one. */
  command?: string | null;
  /** Section-local strength: stars/day, days to removal, recency. */
  strength: number;
}

/** Per-section caps for the 5-item Telegram brief; order is priority. */
const QUOTA: Array<[Section, number]> = [
  ["breaking", 1],
  ["claude", 2],
  ["models", 1],
  ["repos", 1],
  ["tools", 1],
];
export const BRIEF_SIZE = 5;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Terms of the reader's stack found in the text, capped at 2. */
export function stackScore(text: string, stack: string[]): number {
  const hits = stack.filter((term) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, "i").test(
      text,
    ),
  ).length;
  return Math.min(2, hits);
}

export interface RankContext {
  stack: string[];
  /** -1..1 per source, from Telegram votes. */
  weights: Map<string, number>;
}

/** Stack and votes reorder inside a section; they never move items across. */
export function relevance(item: BriefItem, ctx: RankContext): number {
  return (
    stackScore(`${item.title} ${item.line}`, ctx.stack) +
    2 * (ctx.weights.get(item.source) ?? 0)
  );
}

export function sortSection(items: BriefItem[], ctx: RankContext): BriefItem[] {
  return [...items].sort(
    (a, b) => relevance(b, ctx) - relevance(a, ctx) || b.strength - a.strength,
  );
}

/**
 * Quota pass first, so one busy section cannot crowd out the rest; leftover
 * slots go to the next items in section priority order.
 */
export function pickTop(
  sections: Map<Section, BriefItem[]>,
  size = BRIEF_SIZE,
): BriefItem[] {
  const picked: BriefItem[] = [];
  const rest: BriefItem[] = [];
  for (const [section, quota] of QUOTA) {
    const items = sections.get(section) ?? [];
    picked.push(...items.slice(0, quota));
    rest.push(...items.slice(quota));
  }
  return [...picked, ...rest].slice(0, size);
}
