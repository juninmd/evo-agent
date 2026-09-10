import { describe, expect, it } from "vitest";
import type { GeneratedArticle } from "../agent/types.js";
import {
  buildArticleLayout,
  buildDefaultLayout,
  buildMarkdown,
  buildSiteFiles,
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

describe("buildSiteFiles", () => {
  it("enables the feed and sitemap plugins", () => {
    const config = buildSiteFiles("owner", "repo", "gh-pages").find(
      (file) => file.path === "_config.yml",
    );
    expect(config?.content).toContain("jekyll-feed");
    expect(config?.content).toContain("jekyll-sitemap");
  });
});
