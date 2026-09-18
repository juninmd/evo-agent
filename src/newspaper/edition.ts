import type { RadarBucket } from "../agent/radar-buckets.js";
import { cleanSummary, displayUrl } from "../agent/radar-format.js";
import type { LaunchOfDay } from "../agent/radar-launches.js";
import type { Article } from "../knowledge/store.js";
import { imageFor } from "./images.js";
import { type Reading, parseReading, plainText } from "./inline.js";

export interface Story {
  title: string;
  url: string;
  summary: string;
  source: string;
  signal: number;
  image: string | null;
}

export interface Desk {
  key: string;
  title: string;
  feature: Story;
  briefs: Story[];
}

export interface Edition {
  day: string;
  lead: { kicker: string; headline: string; dek: string; story: Story | null };
  launches: Story[];
  reading: Reading;
  desks: Desk[];
  totals: { items: number; sources: number };
}

const BRIEFS_PER_DESK = 5;
// "Claude Code v2.1.267 – adicionou X": the product is the headline, the rest the dek.
const HEADLINE_BREAK = /\s+[–—-]\s+|:\s+/;

function splitHeadline(line: string): { headline: string; dek: string } {
  const text = plainText(line);
  const match = HEADLINE_BREAK.exec(text);
  if (!match || match.index < 4) return { headline: text, dek: "" };
  return {
    headline: text.slice(0, match.index),
    dek: text.slice(match.index + match[0].length),
  };
}

/** The story a headline is about: its title appears in the line, pictured first. */
function storyFor(line: string, stories: Story[]): Story | null {
  const text = line.toLowerCase();
  const matches = stories
    .filter(
      (story) =>
        story.title.length >= 4 && text.includes(story.title.toLowerCase()),
    )
    .sort(
      (left, right) =>
        Number(Boolean(right.image)) - Number(Boolean(left.image)) ||
        right.title.length - left.title.length,
    );
  return matches[0] ?? null;
}

function toStory(article: Article, source = article.source): Story {
  const url = displayUrl(article.url);
  return {
    title: article.title,
    url,
    summary: cleanSummary(article.summary),
    source,
    signal: article.engagement_score,
    image: imageFor(url),
  };
}

function toDesk(bucket: RadarBucket): Desk | null {
  const stories = bucket.articles.map((article) => toStory(article));
  if (stories.length === 0) return null;
  // A desk opens on a picture when it has one; order is otherwise the radar's.
  const featureIndex = Math.max(
    0,
    stories.findIndex((story) => story.image),
  );
  const [feature] = stories.splice(featureIndex, 1);
  return {
    key: bucket.key,
    title: bucket.title,
    feature,
    briefs: stories.slice(0, BRIEFS_PER_DESK),
  };
}

export function buildEdition(input: {
  day: string;
  buckets: RadarBucket[];
  launches: LaunchOfDay[];
  reading: string;
}): Edition {
  const reading = parseReading(input.reading);
  const launches = input.launches.map(({ lead, sources }) =>
    toStory(lead, sources.join(" · ")),
  );
  const desks = input.buckets
    .map(toDesk)
    .filter((desk): desk is Desk => desk !== null);
  const all = input.buckets.flatMap((bucket) => bucket.articles);
  const first = splitHeadline(reading.tldr[0] ?? desks[0]?.feature.title ?? "");
  // A launch of the day always leads; otherwise the editor's first line does.
  const lead = launches[0]
    ? {
        kicker: "Lançamento do dia",
        headline: launches[0].title,
        dek: launches[0].summary,
        story: launches[0],
      }
    : {
        kicker: "Manchete",
        ...first,
        story: storyFor(
          plainText(reading.tldr[0] ?? ""),
          all.map((article) => toStory(article)),
        ),
      };
  return {
    day: input.day,
    lead,
    launches,
    reading,
    desks,
    totals: {
      items: new Set(all.map((article) => displayUrl(article.url))).size,
      sources: new Set(all.map((article) => article.source)).size,
    },
  };
}
