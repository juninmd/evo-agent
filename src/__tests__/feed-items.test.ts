import { describe, expect, it } from "vitest";
import {
  FEED_MAX_AGE_DAYS,
  feedItemSummary,
  isEmptyRelease,
  isPrereleaseTitle,
  selectFeedItems,
} from "../crawler/feed-items.js";
import { rankDailyPapers } from "../crawler/hf-papers.js";

const NOW = new Date("2026-09-17T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("feed item selection", () => {
  it("keeps the newest items even when the feed lists them oldest first", () => {
    const items = Array.from({ length: 15 }, (_, index) => ({
      title: `post ${index}`,
      link: `https://x.dev/${index}`,
      isoDate: daysAgo(14 - index),
    }));
    const selected = selectFeedItems(items, NOW, 3);
    expect(selected.map((item) => item.title)).toEqual([
      "post 14",
      "post 13",
      "post 12",
    ]);
  });

  it("drops posts older than the window so dormant blogs stop injecting old news", () => {
    const selected = selectFeedItems(
      [
        { title: "fresh", isoDate: daysAgo(1) },
        { title: "stale", isoDate: daysAgo(FEED_MAX_AGE_DAYS + 1) },
        { title: "ancient", pubDate: "Mon, 01 Mar 2019 10:00:00 GMT" },
      ],
      NOW,
    );
    expect(selected.map((item) => item.title)).toEqual(["fresh"]);
  });

  it("keeps undated items after dated ones instead of silencing the source", () => {
    const selected = selectFeedItems(
      [{ title: "undated" }, { title: "dated", isoDate: daysAgo(2) }],
      NOW,
    );
    expect(selected.map((item) => item.title)).toEqual(["dated", "undated"]);
  });

  it("falls back to the HTML body when the feed has no text snippet", () => {
    expect(
      feedItemSummary({
        contentSnippet: "",
        content: "<p>Claude Code <b>2.3</b> adds hooks.</p>",
      }),
    ).toBe("Claude Code 2.3 adds hooks.");
    expect(feedItemSummary({ summary: "Atom summary" })).toBe("Atom summary");
    expect(feedItemSummary({})).toBe("");
  });

  it("flags changesets releases that only bump dependencies", () => {
    expect(
      isEmptyRelease(
        "Patch Changes Updated dependencies [91c2128] Updated dependencies [2cd80b3] @ai-sdk/provider-utils@5.0.43",
      ),
    ).toBe(true);
    expect(isEmptyRelease("Patch Changes @ai-sdk/harness@1.0.114")).toBe(true);
    expect(
      isEmptyRelease(
        "Patch Changes def3cdf: feat(alibaba): preserve reasoning in multi-turn requests",
      ),
    ).toBe(false);
    expect(isEmptyRelease("Highlights 786 PRs from 214 contributors")).toBe(
      false,
    );
    // Tag-only bodies (Cline SDK packages, OpenCode bumps) say nothing either.
    expect(isEmptyRelease("@cline/shared@0.0.83")).toBe(true);
    expect(isEmptyRelease("release: v2.0.1")).toBe(true);
    expect(isEmptyRelease("")).toBe(false);
    expect(isEmptyRelease("No content.")).toBe(true);
  });

  it("skips nightly and release-candidate builds, keeps stable ones", () => {
    expect(
      isPrereleaseTitle("Release v0.61.0-nightly.20260911.ged2ac40df"),
    ).toBe(true);
    expect(isPrereleaseTitle("v1.101.0-rc.1")).toBe(true);
    expect(isPrereleaseTitle("v2.0.0-beta.3")).toBe(true);
    expect(isPrereleaseTitle("v2.1.267")).toBe(false);
    expect(isPrereleaseTitle("Cursor Projects")).toBe(false);
    // Titles are prose on blogs: "preview" there is news, not a build tag.
    expect(isPrereleaseTitle("Copilot agent mode in public preview")).toBe(
      false,
    );
  });

  it("bounds the summary so release notes do not flood the prompt", () => {
    expect(feedItemSummary({ contentSnippet: "a ".repeat(2000) }).length).toBe(
      500,
    );
  });
});

describe("Hugging Face daily papers", () => {
  const entry = (id: string, upvotes: number, numComments = 0) => ({
    title: `paper ${id}`,
    numComments,
    paper: { id, upvotes, summary: `abstract ${id}` },
  });

  it("ranks by community votes and drops unvoted papers", () => {
    const ranked = rankDailyPapers(
      [entry("a", 3), entry("b", 295, 4), entry("c", 58), entry("d", 0)],
      2,
    );
    expect(ranked.map((paper) => paper.url)).toEqual([
      "https://huggingface.co/papers/b",
      "https://huggingface.co/papers/c",
    ]);
    expect(ranked[0].engagement).toBe(303);
  });

  it("ignores malformed entries from the API", () => {
    expect(
      rankDailyPapers([
        { title: "no paper" },
        { title: "path traversal", paper: { id: "../x", upvotes: 9 } },
      ]),
    ).toEqual([]);
  });
});
