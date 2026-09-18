import type Parser from "rss-parser";

/** Older posts are archive, not news; also covers the weekly and biweekly reports. */
export const FEED_MAX_AGE_DAYS = 14;
export const FEED_ITEMS_PER_SOURCE = 10;
const FEED_SUMMARY_MAX = 500;

type FeedItem = Pick<
  Parser.Item,
  "title" | "link" | "isoDate" | "pubDate" | "contentSnippet" | "content"
> & { summary?: string };

export function summarizeSourceContent(value: string, maxLength = 800): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*`_>|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function itemTime(item: FeedItem): number | null {
  const time = new Date(item.isoDate ?? item.pubDate ?? "").getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Feeds are not guaranteed newest-first (Hugging Face and OpenAI ship 800+
 * items), so taking the head of the list can skip the news or replay 2019.
 */
export function selectFeedItems<T extends FeedItem>(
  items: T[],
  now = new Date(),
  limit = FEED_ITEMS_PER_SOURCE,
): T[] {
  const cutoff = now.getTime() - FEED_MAX_AGE_DAYS * 86_400_000;
  return items
    .map((item) => ({ item, time: itemTime(item) }))
    .filter(({ time }) => time === null || time >= cutoff)
    .sort(
      (left, right) =>
        (right.time ?? Number.NEGATIVE_INFINITY) -
        (left.time ?? Number.NEGATIVE_INFINITY),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

/**
 * Changesets monorepos publish one release per package per bump; entries with
 * no commit-hash change line ("abc1234: feat…") carry no news, and neither do
 * bodies that only repeat the tag ("@cline/shared@0.0.83", "release: v2.0.1").
 */
export function isEmptyRelease(summary: string): boolean {
  const dependencyBump =
    /^Patch Changes\b/.test(summary) && !/\b[0-9a-f]{7,}:\s/.test(summary);
  const tagOnly = /^(release:\s*)?[@\w./-]*\d+\.\d+\.\d+$/i.test(summary);
  return dependencyBump || tagOnly || /^no content\.?$/i.test(summary);
}

/** Only a semver pre-release suffix counts, so blog prose like "in preview" stays. */
export function isPrereleaseTitle(title: string): boolean {
  return /\d+\.\d+\.\d+-(nightly|rc|alpha|beta|preview|canary|dev)\b/i.test(
    title,
  );
}

/** Atom feeds (Simon Willison, Node.js, Hugging Face) leave contentSnippet empty. */
export function feedItemSummary(item: FeedItem): string {
  const text =
    item.contentSnippet?.trim() ||
    summarizeSourceContent(item.content ?? item.summary ?? "");
  return summarizeSourceContent(text, FEED_SUMMARY_MAX);
}
