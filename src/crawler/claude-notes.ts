import axios from "axios";
import { db } from "../knowledge/store.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
import { log } from "../utils/logger.js";
import { FEED_MAX_AGE_DAYS, summarizeSourceContent } from "./feed-items.js";

export const CLAUDE_NOTES_SOURCE = "Claude Platform Release Notes";
export const CLAUDE_NOTES_URL =
  "https://platform.claude.com/docs/en/release-notes/overview";
/** The page publishes a Markdown twin: headings and bullets, no HTML scraping. */
const CLAUDE_NOTES_MD = `${CLAUDE_NOTES_URL}.md`;
/** Deprecations are announced months ahead; the removal date is what matters. */
const DEPRECATION_LOOKBACK_DAYS = 240;
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const DATE_TEXT = new RegExp(
  `\\b(${MONTHS.join("|")}) (\\d{1,2}), (\\d{4})\\b`,
  "gi",
);
const BREAKING = /\b(deprecat\w*|retir\w*|remov\w*|sunset\w*|end of life)\b/i;
// The removal date follows these words; the announcement date does not.
const REMOVAL_CUE =
  /\b(removal|removed|retirement|retired|retiring|sunset|end of life)\b[^.]*?$/i;

export interface ReleaseNote {
  day: string;
  index: number;
  text: string;
}

export interface Removal {
  /** ISO day the change stops working. */
  date: string;
  note: ReleaseNote;
}

function isoFromText(month: string, day: string, year: string): string | null {
  const monthIndex = MONTHS.indexOf(month.toLowerCase());
  if (monthIndex < 0) return null;
  const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

/** `### November 17, 2026` sections, one note per `* ` bullet. */
export function parseReleaseNotes(markdown: string): ReleaseNote[] {
  const notes: ReleaseNote[] = [];
  let day: string | null = null;
  let index = 0;
  let current: string[] | null = null;
  const flush = () => {
    if (day && current) {
      const text = current.join(" ").replace(/\s+/g, " ").trim();
      if (text) notes.push({ day, index: index++, text });
    }
    current = null;
  };
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^###\s+([A-Za-z]+) (\d{1,2}), (\d{4})\s*$/);
    if (heading) {
      flush();
      day = isoFromText(heading[1], heading[2], heading[3]);
      index = 0;
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      flush();
      day = null;
      continue;
    }
    const bullet = line.match(/^\*\s+(.*)$/);
    if (bullet) {
      flush();
      current = [bullet[1]];
    } else if (current && line.trim() && /^\s+/.test(line)) {
      current.push(line.trim());
    } else if (!line.trim()) {
      flush();
    }
  }
  flush();
  return notes;
}

/** Markdown links become their labels; code spans keep their text. */
export function plainNote(text: string): string {
  return (
    text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Underscores stay: they are part of identifiers like billing_policy.
      .replace(/[*`]/g, "")
      .trim()
  );
}

/** Last date after a removal cue: "deprecated X, with removal on November 30, 2026". */
export function removalDate(text: string): string | null {
  const plain = plainNote(text);
  if (!BREAKING.test(plain)) return null;
  let found: string | null = null;
  for (const match of plain.matchAll(DATE_TEXT)) {
    const before = plain.slice(0, match.index);
    if (REMOVAL_CUE.test(before)) {
      found = isoFromText(match[1], match[2], match[3]) ?? found;
    }
  }
  return found;
}

/** First sentence, cut at a word under 90 chars: the summary carries the rest. */
export function headline(plain: string): string {
  const sentence = plain.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? plain;
  if (sentence.length <= 90) return sentence;
  const cut = sentence.slice(0, 90);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function upcomingRemovals(
  notes: ReleaseNote[],
  today: string,
): Removal[] {
  return notes
    .map((note) => ({ note, date: removalDate(note.text) }))
    .filter((item): item is Removal => item.date !== null)
    .filter((item) => item.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function noteUrl(note: ReleaseNote): string {
  return `${CLAUDE_NOTES_URL}#${note.day}-${note.index}`;
}

function daysBefore(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export interface ClaudeNotesDeps {
  fetch: () => Promise<string>;
}

const defaultDeps: ClaudeNotesDeps = {
  fetch: async () => {
    const { data } = await axios.get<string>(CLAUDE_NOTES_MD, {
      ...HTTP_LIMITS,
      timeout: 20_000,
      responseType: "text",
    });
    return typeof data === "string" ? data : "";
  },
};

/**
 * Recent notes land as articles; older ones only when they announce a removal
 * still ahead, so "O que vai quebrar" sees deprecations made months ago.
 */
export async function crawlClaudeNotes(
  now = new Date(),
  deps: ClaudeNotesDeps = defaultDeps,
): Promise<number> {
  const notes = parseReleaseNotes(await deps.fetch());
  if (notes.length === 0) throw new Error("No release note parsed");
  const today = now.toISOString().slice(0, 10);
  const recent = daysBefore(today, FEED_MAX_AGE_DAYS);
  const lookback = daysBefore(today, DEPRECATION_LOOKBACK_DAYS);
  let saved = 0;
  for (const note of notes) {
    const removal = removalDate(note.text);
    const keep =
      note.day >= recent ||
      (removal !== null && removal >= today && note.day >= lookback);
    const url = noteUrl(note);
    if (!keep || db.urlExists(url)) continue;
    const plain = plainNote(note.text);
    db.saveArticle({
      title: `Claude API ${note.day}: ${headline(plain)}`,
      source: CLAUDE_NOTES_SOURCE,
      url,
      summary: summarizeSourceContent(plain, 500),
      body: note.text,
      tags: JSON.stringify([
        "claude",
        "anthropic",
        "release-notes",
        ...(removal ? ["deprecation", `removal:${removal}`] : []),
      ]),
      engagement_score: 0,
    });
    saved++;
  }
  log.info(`Crawled ${CLAUDE_NOTES_SOURCE}, ${saved} new notes`);
  return saved;
}
