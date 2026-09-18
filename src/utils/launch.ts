import type { Article } from "../knowledge/store.js";

/**
 * Release time travels as a tag (epoch seconds) because crawled_at only says
 * when we saw it: the 14-day launch window would otherwise replay old models.
 */
const LAUNCH_TAG = /^launched-(\d{9,11})$/;
const LAUNCH_OF_DAY_HOURS = 24;
// Vendor clocks run slightly ahead of ours; a release "from the future" is still today's.
const CLOCK_SKEW_HOURS = 1;

export function launchTag(epochSeconds: number): string {
  return `launched-${Math.floor(epochSeconds)}`;
}

function launchedAt(article: Article): number | null {
  try {
    const tags = JSON.parse(article.tags) as unknown;
    if (!Array.isArray(tags)) return null;
    for (const tag of tags) {
      const match = typeof tag === "string" ? LAUNCH_TAG.exec(tag) : null;
      if (match) return Number(match[1]);
    }
  } catch {
    return null;
  }
  return null;
}

export function isLaunchOfDay(article: Article, now = new Date()): boolean {
  const released = launchedAt(article);
  if (released === null) return false;
  const ageHours = (now.getTime() / 1000 - released) / 3600;
  return ageHours >= -CLOCK_SKEW_HOURS && ageHours <= LAUNCH_OF_DAY_HOURS;
}
