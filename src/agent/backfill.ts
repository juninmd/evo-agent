import { assertValidArticle } from "./article-validation.js";
import type { GeneratedArticle } from "./types.js";

export function historicalDates(start: string, end: string): string[] {
  const first = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isFinite(last.getTime()) ||
    first > last
  ) {
    throw new Error(`Invalid backfill range: ${start}..${end}`);
  }
  const dates: string[] = [];
  for (
    const cursor = new Date(first);
    cursor <= last;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

export function asRetroactiveArticle(
  article: GeneratedArticle,
  targetDate: string,
): GeneratedArticle {
  const retroactive = {
    ...article,
    date: targetDate,
    slug: `retroativo-${targetDate}-${article.slug}`.slice(0, 110),
    tags: [...new Set(["retroativo", ...article.tags])],
  };
  assertValidArticle(retroactive);
  return retroactive;
}

export function parseBackfillCheckpoint(
  value: string | null,
  targetDate: string,
): GeneratedArticle | null {
  if (!value) return null;
  try {
    return asRetroactiveArticle(
      JSON.parse(value) as GeneratedArticle,
      targetDate,
    );
  } catch {
    return null;
  }
}
