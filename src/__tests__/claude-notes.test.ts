import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-claude-notes-"));
process.env.DB_PATH = join(dir, "notes.db");

const { db, getDb } = await import("../knowledge/store.js");
const {
  CLAUDE_NOTES_SOURCE,
  crawlClaudeNotes,
  noteUrl,
  parseReleaseNotes,
  removalDate,
  upcomingRemovals,
} = await import("../crawler/claude-notes.js");

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

// Shapes copied from the official page on 2026-11-22.
const PAGE = `---
title: Claude Platform release notes
---

<Tip>
  For updates to Claude Code, see the changelog.
</Tip>

### November 17, 2026

* We’ve launched [Linked billing](https://platform.claude.com/docs/x) in beta with the \`user-profiles-billing-2026-10-01\` beta header.

### October 30, 2026

* We’ve deprecated [fast mode](https://platform.claude.com/docs/y) for Claude Opus 4.8, with removal on November 30, 2026. After removal, requests return an error.

### June 30, 2026

* We’ve launched **Claude Sonnet 5**, at introductory pricing (made the standard price on August 10, 2026). Manual extended thinking is removed and returns a 400 error.

### April 1, 2026

* We announced the deprecation of Claude Sonnet 4.5 (\`claude-sonnet-4-5-20250929\`), with retirement on the Claude API scheduled for November 30, 2026.
* We’ve retired the Claude Opus 4.1 model. All requests now return an error.
`;

describe("parseReleaseNotes", () => {
  it("splits dated sections into one note per bullet", () => {
    const notes = parseReleaseNotes(PAGE);
    expect(notes.map((note) => `${note.day}#${note.index}`)).toEqual([
      "2026-11-17#0",
      "2026-10-30#0",
      "2026-06-30#0",
      "2026-04-01#0",
      "2026-04-01#1",
    ]);
  });

  it("ignores text outside dated sections", () => {
    expect(
      parseReleaseNotes(PAGE).some((n) => /Tip|changelog/.test(n.text)),
    ).toBe(false);
  });
});

describe("removalDate", () => {
  it("reads the date after the removal cue, not the announcement", () => {
    const [, fast, , sonnet] = parseReleaseNotes(PAGE);
    expect(removalDate(fast.text)).toBe("2026-11-30");
    expect(removalDate(sonnet.text)).toBe("2026-11-30");
  });

  // A launch note that mentions "removed" and a price date is not a removal.
  it("does not mistake a launch note for a removal", () => {
    const launch = parseReleaseNotes(PAGE)[2];
    expect(removalDate(launch.text)).toBeNull();
  });

  it("returns null for a retirement that already happened", () => {
    const retired = parseReleaseNotes(PAGE)[4];
    expect(removalDate(retired.text)).toBeNull();
  });

  it("drops removals already past", () => {
    const upcoming = upcomingRemovals(parseReleaseNotes(PAGE), "2026-12-01");
    expect(upcoming).toEqual([]);
  });
});

describe("crawlClaudeNotes", () => {
  it("saves recent notes and older deprecations still ahead, once", async () => {
    const now = new Date("2026-11-22T12:00:00Z");
    const deps = { fetch: async () => PAGE };
    expect(await crawlClaudeNotes(now, deps)).toBe(3);
    expect(await crawlClaudeNotes(now, deps)).toBe(0);
    const saved = db.getArticlesSince(1, 50, { source: CLAUDE_NOTES_SOURCE });
    const urls = saved.map((a) => a.url).sort();
    const notes = parseReleaseNotes(PAGE);
    expect(urls).toEqual([notes[0], notes[1], notes[3]].map(noteUrl).sort());
    const deprecation = saved.find((a) => a.url === noteUrl(notes[1]));
    expect(JSON.parse(deprecation?.tags ?? "[]")).toContain(
      "removal:2026-11-30",
    );
    expect(deprecation?.summary).not.toContain("](");
  });

  // A bullet added above the others on the same day must not shift their ids.
  it("keeps ids stable when a note is inserted above others", () => {
    const before = parseReleaseNotes(PAGE).map(noteUrl);
    const edited = PAGE.replace(
      "### April 1, 2026\n\n",
      "### April 1, 2026\n\n* We’ve added a brand new thing.\n",
    );
    const after = parseReleaseNotes(edited).map(noteUrl);
    expect(after).toHaveLength(before.length + 1);
    expect(after.filter((url) => !before.includes(url))).toHaveLength(1);
  });

  it("fails loudly when the page format changes", async () => {
    await expect(
      crawlClaudeNotes(new Date(), { fetch: async () => "<html></html>" }),
    ).rejects.toThrow(/No release note/);
  });
});
