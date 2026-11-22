import type { PublishedItem } from "./site-renderer.js";

const MAX_ENTRIES = 40;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Epoch keeps an empty feed byte-identical between publishes.
const EMPTY_FEED_UPDATED = "1970-01-01T00:00:00Z";
// biome-ignore lint/suspicious/noControlCharactersInRegex: XML 1.0 forbids these
const XML_FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

export type FeedSite = { baseUrl: string; title: string; description: string };

function xml(value: string): string {
  return value
    .replace(XML_FORBIDDEN, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEntry(item: PublishedItem): string {
  const categories = (item.tags ?? [])
    .map((tag) => `    <category term="${xml(tag)}"/>`)
    .join("\n");
  return [
    "  <entry>",
    `    <id>${xml(item.url)}</id>`,
    `    <title>${xml(item.title)}</title>`,
    `    <link rel="alternate" href="${xml(item.url)}"/>`,
    `    <updated>${item.date}T00:00:00Z</updated>`,
    item.summary
      ? `    <summary type="text">${xml(item.summary)}</summary>`
      : "",
    categories,
    "  </entry>",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Atom feed of everything on the index. Built here because jekyll-feed only
 * reads `_posts`, while articles and reports are plain pages.
 */
export function buildAtomFeed(
  items: PublishedItem[],
  site: FeedSite,
  path = "feed.xml",
): string {
  const entries = items
    .filter((item) => DAY.test(item.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ENTRIES);
  const updated = entries[0]
    ? `${entries[0].date}T00:00:00Z`
    : EMPTY_FEED_UPDATED;
  return `${[
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${xml(site.baseUrl)}${path}</id>`,
    `  <title>${xml(site.title)}</title>`,
    `  <subtitle>${xml(site.description)}</subtitle>`,
    `  <link rel="self" type="application/atom+xml" href="${xml(site.baseUrl)}${path}"/>`,
    `  <link rel="alternate" href="${xml(site.baseUrl)}"/>`,
    `  <updated>${updated}</updated>`,
    ...entries.map(buildEntry),
    "</feed>",
  ].join("\n")}\n`;
}

/** Per-theme feeds for readers and bots that want one stream only. */
export const THEME_FEEDS: Array<{
  slug: string;
  title: string;
  match: RegExp;
}> = [
  { slug: "claude", title: "Claude", match: /\b(claude|anthropic)\b/i },
  {
    slug: "modelos",
    title: "Modelos",
    match: /\b(modelos?|models?|llms?|radar-dev)\b/i,
  },
  {
    slug: "repos",
    title: "Repositórios",
    match: /\b(github|repos?|reposit\w*|trending|skills?)\b/i,
  },
];

export function buildThemeFeeds(
  items: PublishedItem[],
  site: FeedSite,
): Array<{ path: string; content: string }> {
  return THEME_FEEDS.map((theme) => {
    const path = `feeds/${theme.slug}.xml`;
    const matching = items.filter((item) =>
      theme.match.test(
        [item.title, item.summary ?? "", ...(item.tags ?? [])].join(" "),
      ),
    );
    return {
      path,
      content: buildAtomFeed(
        matching,
        { ...site, title: `${site.title} · ${theme.title}` },
        path,
      ),
    };
  });
}
