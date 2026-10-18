import { describe, expect, it } from "vitest";
import { buildAtomFeed } from "../publisher/feed.js";
import type { PublishedItem } from "../publisher/site-renderer.js";

const SITE = {
  baseUrl: "https://owner.github.io/repo/",
  title: "Evo Agent",
  description: "Relatórios técnicos",
};

const item = (over: Partial<PublishedItem> = {}): PublishedItem => ({
  date: "2026-10-17",
  title: "Edição de sábado",
  url: "https://owner.github.io/repo/articles/2026-10-17-edicao",
  summary: "Resumo da edição.",
  tags: ["claude-code", "agents"],
  ...over,
});

// jekyll-feed only reads _posts, so the published feed.xml had zero entries
// while every page advertised it. The feed is now built from the same items
// that feed the index.
describe("buildAtomFeed", () => {
  it("emits one entry per published item, newest first", () => {
    const xml = buildAtomFeed(
      [
        item({ date: "2026-10-15", url: "https://x/a", title: "Antiga" }),
        item({ date: "2026-10-17", url: "https://x/b", title: "Recente" }),
      ],
      SITE,
    );
    expect(xml.match(/<entry>/g)).toHaveLength(2);
    expect(xml.indexOf("Recente")).toBeLessThan(xml.indexOf("Antiga"));
    expect(xml).toContain("<updated>2026-10-17T00:00:00Z</updated>");
  });

  it("links the entry, carries the summary and one category per tag", () => {
    const xml = buildAtomFeed([item()], SITE);
    expect(xml).toContain(
      '<link rel="alternate" href="https://owner.github.io/repo/articles/2026-10-17-edicao"/>',
    );
    expect(xml).toContain('<summary type="text">Resumo da edição.</summary>');
    expect(xml).toContain('<category term="claude-code"/>');
    expect(xml).toContain('<category term="agents"/>');
  });

  it("escapes crawled text and drops characters XML 1.0 forbids", () => {
    const xml = buildAtomFeed(
      [
        item({
          title: 'A & B <script>"x"</script>\u0000\u000b',
          tags: ['a"b'],
        }),
      ],
      SITE,
    );
    expect(xml).toContain(
      "A &amp; B &lt;script&gt;&quot;x&quot;&lt;/script&gt;",
    );
    expect(xml).not.toContain("<script>");
    const forbidden = [...xml].filter((c) => {
      const code = c.charCodeAt(0);
      return code < 0x20 && ![0x09, 0x0a, 0x0d].includes(code);
    });
    expect(forbidden).toEqual([]);
    expect(xml).toContain('<category term="a&quot;b"/>');
  });

  it("is still a valid feed when nothing is published, with a stable timestamp", () => {
    const a = buildAtomFeed([], SITE);
    expect(a).toContain("<feed");
    expect(a).not.toContain("<entry>");
    expect(buildAtomFeed([], SITE)).toBe(a);
  });

  it("skips items whose date is not YYYY-MM-DD instead of emitting a broken timestamp", () => {
    const xml = buildAtomFeed([item({ date: "ontem" })], SITE);
    expect(xml).not.toContain("<entry>");
  });

  it("caps the feed at the 40 newest entries", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      item({
        date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
        url: `https://x/${i}`,
      }),
    );
    expect(buildAtomFeed(many, SITE).match(/<entry>/g)).toHaveLength(40);
  });
});
