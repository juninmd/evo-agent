import { describe, expect, it } from "vitest";
import type { RadarBucket } from "../agent/radar-buckets.js";
import type { GeneratedArticle } from "../agent/types.js";
import type { Article } from "../knowledge/store.js";
import { buildEdition } from "../newspaper/edition.js";
import { imageFor } from "../newspaper/images.js";
import { newspaperAttachment } from "../newspaper/index.js";
import { inlineHtml, parseReading } from "../newspaper/inline.js";
import { renderNewspaper } from "../newspaper/render.js";
import { buildPublicationBatch } from "../publisher/github.js";

function article(overrides: Partial<Article>): Article {
  return {
    id: 1,
    title: "anthropics/claude-code",
    source: "GitHub Trending",
    url: "https://github.com/anthropics/claude-code",
    summary: "Agentic coding tool.",
    tags: "[]",
    engagement_score: 120,
    crawled_at: "2026-09-18T08:00:00Z",
    ...overrides,
  };
}

const READING = `## TL;DR

1. **Claude Code** v2.3 ships hooks; see [notes](https://github.com/anthropics/claude-code).
2. Qwen4 trends on the Hub.

## O que observar

- Pricing changes for agents.`;

const buckets: RadarBucket[] = [
  {
    key: "community",
    title: "Comunidade e produtos",
    articles: [
      article({ id: 2, title: "No picture", url: "https://example.com/a" }),
      article({ id: 3 }),
    ],
  },
];

describe("newspaper images", () => {
  it("derives card images only from validated GitHub and Hub ids", () => {
    expect(
      imageFor("https://github.com/anthropics/claude-code/releases/tag/v2"),
    ).toBe("https://opengraph.githubassets.com/1/anthropics/claude-code");
    expect(imageFor("https://huggingface.co/Qwen/Qwen4-32B")).toBe(
      "https://cdn-thumbnails.huggingface.co/social-thumbnails/models/Qwen/Qwen4-32B.png",
    );
    expect(imageFor("https://huggingface.co/papers/2609.05661")).toBe(
      "https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/2609.05661.png",
    );
    // Site sections, other hosts and non-https links get no picture.
    expect(imageFor("https://github.com/orgs/github/discussions")).toBeNull();
    expect(imageFor("https://huggingface.co/blog/some-post")).toBeNull();
    expect(imageFor("https://evil.example/github.com/a/b")).toBeNull();
    expect(imageFor("http://github.com/a/b")).toBeNull();
    expect(imageFor("not a url")).toBeNull();
  });
});

describe("newspaper edition", () => {
  it("parses the reading and keeps model output from injecting HTML", () => {
    const reading = parseReading(READING);
    expect(reading.tldr).toHaveLength(2);
    expect(reading.watch).toEqual(["Pricing changes for agents."]);
    expect(inlineHtml('<img src=x onerror="alert(1)"> **ok**')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; <strong>ok</strong>",
    );
    expect(inlineHtml("[x](javascript:alert(1))")).not.toContain("<a ");
  });

  it("opens each desk on the story that has a picture", () => {
    const edition = buildEdition({
      day: "2026-09-18",
      buckets,
      launches: [],
      reading: READING,
    });
    expect(edition.desks[0].feature.title).toBe("anthropics/claude-code");
    expect(edition.desks[0].briefs.map((story) => story.title)).toEqual([
      "No picture",
    ]);
    expect(edition.lead.kicker).toBe("Manchete");
    expect(edition.lead.headline).toContain("Claude Code v2.3 ships hooks");
  });

  it("leads with the launch of the day when there is one", () => {
    const launch = article({
      title: "OpenAI: GPT-7",
      source: "OpenRouter: New Models",
      url: "https://openrouter.ai/openai/gpt-7",
    });
    const edition = buildEdition({
      day: "2026-09-18",
      buckets,
      launches: [{ lead: launch, sources: ["OpenRouter: New Models"] }],
      reading: READING,
    });
    expect(edition.lead.kicker).toBe("Lançamento do dia");
    expect(edition.lead.headline).toBe("OpenAI: GPT-7");
  });

  it("pictures the story the headline is about and splits headline from dek", () => {
    const edition = buildEdition({
      day: "2026-09-18",
      buckets: [
        {
          key: "github",
          title: "GitHub Trending",
          articles: [
            article({
              title: "obra/superpowers",
              url: "https://github.com/obra/superpowers",
            }),
          ],
        },
        {
          key: "releases",
          title: "Releases",
          articles: [
            article({
              id: 9,
              title: "v2.1.267",
              source: "Claude Code Releases",
              url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.267",
            }),
          ],
        },
      ],
      launches: [],
      reading:
        "## TL;DR\n1. Claude Code v2.1.267 – adicionou o setting maxEffortLevel.\n",
    });
    expect(edition.lead.headline).toBe("Claude Code v2.1.267");
    expect(edition.lead.dek).toBe("adicionou o setting maxEffortLevel.");
    expect(edition.lead.story?.url).toContain("anthropics/claude-code");
  });

  it("drops the Reddit boilerplate prefix from summaries", () => {
    const edition = buildEdition({
      day: "2026-09-18",
      buckets: [
        {
          key: "reddit",
          title: "Reddit",
          articles: [
            article({
              summary:
                'Post da comunidade em r/ClaudeCode sobre "x". Relato do autor, sem os comentarios da discussao. Hooks broke.',
            }),
          ],
        },
      ],
      launches: [],
      reading: READING,
    });
    expect(edition.desks[0].feature.summary).toBe("Hooks broke.");
  });

  it("renders escaped titles and resolves images through the injected mapper", () => {
    const edition = buildEdition({
      day: "2026-09-18",
      buckets: [
        {
          ...buckets[0],
          articles: [article({ title: "<script>x</script> repo" })],
        },
      ],
      launches: [],
      reading: READING,
    });
    const html = renderNewspaper(edition, {
      resolveImage: () => "data:image/png;base64,AAAA",
    });
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt; repo");
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).not.toContain("<!doctype");
    expect(renderNewspaper(edition, { document: true })).toMatch(
      /^<!doctype html>/,
    );
  });
});

describe("newspaper attachment", () => {
  const input = { day: "2026-09-18", buckets, launches: [], reading: READING };

  it("renders the site page at jornal/<day>.html", () => {
    const page = newspaperAttachment(input);
    expect(page?.path).toBe("jornal/2026-09-18.html");
    expect(page?.content).toMatch(/^<!doctype html>/);
  });

  it("never takes the radar down: a render failure yields no attachment", () => {
    const page = newspaperAttachment(input, () => {
      throw new TypeError("boom");
    });
    expect(page).toBeNull();
  });
});

describe("publishing attachments", () => {
  const radar: GeneratedArticle = {
    title: "Radar IA — 18/09/2026",
    slug: "radar-2026-09-18",
    content: "## TL;DR",
    summary: "Radar.",
    tags: ["radar"],
    date: "2026-09-18",
    sources: [],
    evidence: [],
    editorialMetrics: {
      considered: 1,
      selected: 1,
      rejected: 0,
      buckets: {},
      primarySources: 0,
    },
  };
  const target = { owner: "o", repo: "r", branch: "gh-pages" };

  it("ships the newspaper in the same commit as the radar", () => {
    const batch = buildPublicationBatch(
      [
        {
          article: {
            ...radar,
            attachments: [{ path: "jornal/2026-09-18.html", content: "<p>" }],
          },
          reportPeriod: "radar",
        },
      ],
      [],
      target,
    );
    expect(batch.files.map((file) => file.path)).toContain(
      "jornal/2026-09-18.html",
    );
  });

  it("refuses attachment paths that could overwrite the site", () => {
    for (const path of ["index.md", "../x.html", "jornal/../_config.yml"]) {
      expect(() =>
        buildPublicationBatch(
          [
            {
              article: { ...radar, attachments: [{ path, content: "x" }] },
              reportPeriod: "radar",
            },
          ],
          [],
          target,
        ),
      ).toThrow(/attachment path/i);
    }
  });
});
