import { describe, expect, it } from "vitest";
import type { GeneratedArticle } from "../agent/types.js";
import {
  buildArticleLayout,
  buildDefaultLayout,
  buildIndex,
  buildMarkdown,
  buildSiteFiles,
  buildYearArchives,
  estimateReadingMinutes,
} from "../publisher/site-renderer.js";

function article(overrides: Partial<GeneratedArticle> = {}): GeneratedArticle {
  return {
    title: "Titulo",
    content: "Corpo do artigo.",
    date: "2026-06-09",
    tags: ["ia"],
    summary: "Resumo.",
    ...overrides,
  } as GeneratedArticle;
}

describe("buildMarkdown front matter", () => {
  it("keeps a quoted YAML scalar valid when the title carries quotes", () => {
    const markdown = buildMarkdown(
      article({ title: 'O "modo agente" mudou \\ tudo' }),
    );
    expect(markdown).toContain('title: "O \\"modo agente\\" mudou \\\\ tudo"');
  });

  // A raw newline or control character ends the scalar early: Jekyll then fails
  // to parse the front matter and the page never builds.
  it("flattens newlines and control characters out of the scalar", () => {
    const markdown = buildMarkdown(
      article({
        title: "Linha um\nLinha dois",
        summary: "Resumo\u0007com quebras",
      }),
    );
    const frontMatter = markdown.split("---")[1];

    for (const line of frontMatter.split("\n")) {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting their absence is the point
      expect(line).not.toMatch(/[\u0000-\u001f]/);
    }
    expect(frontMatter).toContain('title: "Linha um Linha dois"');
    expect(frontMatter).toContain('summary: "Resumo com quebras"');
  });

  it("defuses an endraw tag that would break out of the raw block", () => {
    const markdown = buildMarkdown(
      article({ content: "Antes {% endraw %}{{ site.github_token }} depois" }),
    );
    // Exactly one real endraw tag remains: the one this function emits.
    expect(markdown.match(/\{% endraw %\}/g)).toHaveLength(1);
    expect(markdown).toContain("{\u200b% endraw %}");
  });

  it("leaves other Liquid snippets untouched so examples stay readable", () => {
    const markdown = buildMarkdown(
      article({ content: "Use `{% for post in site.posts %}` no layout." }),
    );
    expect(markdown).toContain("{% for post in site.posts %}");
  });

  it("stamps a reading-time estimate from the article body", () => {
    const markdown = buildMarkdown(
      article({ content: "palavra ".repeat(400) }),
    );
    expect(markdown).toContain("reading_time: 2");
  });
});

describe("estimateReadingMinutes", () => {
  it("rounds to whole minutes at ~200 words per minute, minimum 1", () => {
    expect(estimateReadingMinutes("palavra ".repeat(10))).toBe(1);
    expect(estimateReadingMinutes("palavra ".repeat(400))).toBe(2);
    expect(estimateReadingMinutes("palavra ".repeat(1000))).toBe(5);
    expect(estimateReadingMinutes("")).toBe(1);
  });
});

describe("layouts", () => {
  const layouts = [
    ["default", buildDefaultLayout()],
    ["article", buildArticleLayout()],
  ] as const;

  // Liquid does not escape `{{ }}`; page titles and summaries come from crawled
  // text, so an unescaped interpolation is stored XSS on the published site.
  it.each(layouts)("escapes every page interpolation (%s)", (_name, html) => {
    expect(html).not.toContain("{{ page.title }}");
    expect(html).not.toContain("{{ page.summary }}");
    expect(html).not.toContain("{{ tag }}");
    expect(html).toContain("{{ page.title | escape }}");
  });

  it.each(layouts)(
    "declares canonical and social metadata (%s)",
    (_n, html) => {
      expect(html).toContain('<link rel="canonical"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain('type="application/atom+xml"');
    },
  );

  // Telegram and X only render a large preview card when an image is declared.
  it.each(layouts)("declares a large link-preview image (%s)", (_n, html) => {
    expect(html).toContain(
      '<meta property="og:image" content="{{ \'/assets/og-card.png\' | absolute_url }}">',
    );
    expect(html).toContain('content="summary_large_image"');
  });

  it.each(layouts)("keeps the theme toggle operable (%s)", (_name, html) => {
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Alternar tema claro e escuro"');
    expect(html).toContain('class="skip-link"');
  });

  // A template literal turns `\w` into a bare `w`, so the language badge only
  // ever matched languages literally starting with "w".
  it.each(layouts)("emits a working language-class regex (%s)", (_n, html) => {
    const match = html.match(/language-\(([^)]*)\)/);
    expect(match?.[1]).toBe("\\w+");
  });

  it("renders both layouts from the same shared shell", () => {
    const [defaultHtml, articleHtml] = layouts.map(([, html]) => html);
    const head = defaultHtml.slice(0, defaultHtml.indexOf("</head>"));
    expect(articleHtml).toContain(head.slice(head.indexOf("<meta charset")));
  });
});

describe("buildIndex", () => {
  const item = (date: string, title = `Edicao ${date}`) => ({
    date,
    title,
    url: `https://example.test/${date}`,
    summary: "Resumo.",
    tags: ["ia"],
  });

  // The publisher does not guarantee order; the featured edition must still
  // be the newest one or the home page points readers at stale news.
  it("features the newest edition regardless of input order", () => {
    const html = buildIndex(
      [item("2026-09-24"), item("2026-09-26"), item("2026-09-25")],
      [],
    );
    const latest = html.slice(html.indexOf('class="latest"'));
    expect(latest).toContain("https://example.test/2026-09-26");
    expect(latest).toContain('<span class="edition-day">26</span>');
  });

  it("escapes crawled titles in the featured edition and the archive", () => {
    const html = buildIndex([item("2026-09-26", "<img src=x onerror=1>")], []);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=1&gt;");
  });

  it("does not list the featured edition again in the archive", () => {
    const html = buildIndex([item("2026-09-26"), item("2026-09-25")], []);
    const archive = html.slice(html.indexOf('id="arquivo"'));
    expect(archive).not.toContain("https://example.test/2026-09-26");
    expect(archive).toContain("https://example.test/2026-09-25");
  });

  it("keeps a lone edition out of the empty-state message", () => {
    const html = buildIndex([item("2026-09-26")], []);
    expect(html).not.toContain("Nenhuma edição publicada ainda.");
    expect(buildIndex([], [])).toContain("Nenhuma edição publicada ainda.");
  });

  it("keeps the two newest months open and folds older ones behind a toggle", () => {
    const html = buildIndex(
      [
        item("2026-09-26"),
        item("2026-09-10"),
        item("2026-08-10"),
        item("2026-07-10"),
        item("2026-06-10"),
        item("2026-06-09"),
      ],
      [],
    );
    expect(html).toContain('class="month-group" id="mes-2026-09"');
    expect(html).toContain('class="month-group" id="mes-2026-08"');
    expect(html).toContain(
      'class="month-group is-collapsed" hidden id="mes-2026-07"',
    );
    expect(html).toContain(
      'class="month-group is-collapsed" hidden id="mes-2026-06"',
    );
    expect(html).toContain(
      'data-show-more="arquivo">Ver edições anteriores (3)',
    );
    // Every month stays in the jump nav so a link can open its group.
    expect(html).toContain('href="#mes-2026-06"');
  });

  it("omits the older-months toggle when everything fits", () => {
    const html = buildIndex([item("2026-09-26"), item("2026-08-10")], []);
    expect(html).not.toContain('data-show-more="arquivo"');
  });

  it("makes the summary searchable, including on the featured edition", () => {
    const html = buildIndex(
      [
        { ...item("2026-09-26"), summary: "Quantização\nem GGUF" },
        item("2026-09-25"),
      ],
      [],
    );
    expect(html).toContain(
      'data-search="edicao 2026-09-26 quantização em gguf ia"',
    );
    expect(html).toContain("Buscar por título, resumo ou tag");
  });

  it("collapses radar entries past the first six behind a toggle", () => {
    const reports = Array.from({ length: 8 }, (_, i) =>
      item(`2026-09-${String(10 + i).padStart(2, "0")}`),
    );
    const html = buildIndex([], reports);
    expect(html.match(/class="is-collapsed" hidden/g)).toHaveLength(2);
    expect(html).toContain('data-show-more="relatorios"');
    expect(html).toContain('id="relatorios"');
    expect(html).toContain('id="arquivo"');
  });
});

describe("buildSiteFiles", () => {
  it("enables the sitemap plugin and leaves feed.xml to the publisher", () => {
    const config = buildSiteFiles("owner", "repo", "gh-pages").find(
      (file) => file.path === "_config.yml",
    );
    expect(config?.content).not.toContain("jekyll-feed");
    expect(config?.content).toContain("jekyll-sitemap");
  });

  it("ships the preview image the layouts point to as a real PNG", () => {
    const image = buildSiteFiles("owner", "repo", "gh-pages").find(
      (file) => file.path === "assets/og-card.png",
    );
    expect(image?.encoding).toBe("base64");
    const bytes = Buffer.from(image?.content ?? "", "base64");
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  });
});

describe("rolling home window and yearly archives", () => {
  const monthly = (year: number, month: number, n = 2) =>
    Array.from({ length: n }, (_, i) => ({
      date: `${year}-${String(month).padStart(2, "0")}-${String(10 + i).padStart(2, "0")}`,
      title: `Edição ${year}-${month}-${i}`,
      url: `https://o.github.io/r/articles/${year}-${month}-${i}`,
      summary: "resumo",
      tags: ["ai"],
    }));
  // 2026-12 back to 2025-01 (24 months), two editions each.
  const twoYears = [
    ...Array.from({ length: 12 }, (_, m) => monthly(2026, 12 - m)).flat(),
    ...Array.from({ length: 12 }, (_, m) => monthly(2025, 12 - m)).flat(),
  ];

  it("keeps the home to the newest 12 months and links older years", () => {
    const index = buildIndex(twoYears, []);
    expect(index).toContain('id="mes-2026-12"');
    expect(index).toContain('id="mes-2026-01"');
    expect(index).not.toContain('id="mes-2025-12"');
    expect(index).not.toContain("Edição 2025-3-0");
    expect(index).toContain("{{ '/arquivo/2025' | relative_url }}");
    expect(index).toContain("24 edições");
    expect(index).toContain("<strong>48</strong> edições");
  });

  it("writes one page per year that left the window, with the whole year", () => {
    const pages = buildYearArchives(twoYears);
    expect(pages.map((p) => p.path)).toEqual(["arquivo/2025.md"]);
    const [page] = pages;
    expect(page.content).toContain("layout: home");
    expect(page.content).toContain('title: "Arquivo 2025"');
    expect(page.content).toContain("24 edições publicadas em 2025");
    expect(page.content).toContain('id="mes-2025-12"');
    expect(page.content).toContain('id="mes-2025-01"');
    expect(page.content).toContain('id="story-search"');
    expect(page.content).not.toContain("Edição 2026-");
  });

  it("adds no year pages and no year links while everything fits the window", () => {
    const recent = twoYears.slice(0, 20);
    expect(buildYearArchives(recent)).toEqual([]);
    expect(buildIndex(recent, [])).not.toContain("archive-years");
  });

  it("pages a year as soon as its first month leaves the window", () => {
    const old = [
      ...monthly(2027, 1, 1),
      ...Array.from({ length: 12 }, (_, m) => monthly(2026, 12 - m, 1)).flat(),
      ...monthly(2025, 12, 1),
    ];
    const pages = buildYearArchives(old);
    expect(pages.map((p) => p.path)).toEqual(["arquivo/2025.md"]);
    expect(pages[0].content).toContain("1 edição publicada em 2025.");
  });

  it("escapes crawled titles on the year page", () => {
    const hostile = [
      {
        ...monthly(2024, 5, 1)[0],
        title: '<img src=x onerror="alert(1)">',
      },
      ...twoYears,
    ];
    const [page] = buildYearArchives(hostile).filter((p) =>
      p.path.endsWith("2024.md"),
    );
    expect(page.content).not.toContain("<img src=x");
    expect(page.content).toContain("&lt;img");
  });
});
