import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildArticleCard,
  notifyModelLaunch,
  notifyNewArticle,
  siteRootOf,
} from "../notifier/telegram.js";

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return { default: { ...actual.default, post: vi.fn() } };
});

const post = vi.mocked(axios.post);
const ARTICLE = "https://example.github.io/evo-agent/2026/09/29/edicao.html";

afterEach(() => post.mockReset());

describe("telegram article card", () => {
  it("previews the site root, large and above the text", async () => {
    post.mockResolvedValue({});

    await notifyNewArticle("Titulo", ARTICLE, "Resumo", [
      "https://openai.com/blog/x",
    ]);

    const body = post.mock.calls[0][1] as Record<string, unknown>;
    // Without an explicit url Telegram previews the first link in the text,
    // which is a source; the fresh article may still 404 while Pages builds.
    expect(body.link_preview_options).toEqual({
      url: "https://example.github.io/evo-agent/",
      prefer_large_media: true,
      show_above_text: true,
    });
    expect(body).not.toHaveProperty("disable_web_page_preview");
    expect(body.reply_markup).toEqual({
      inline_keyboard: [[{ text: "📖 Ler edição completa", url: ARTICLE }]],
    });
  });

  it("escapes crawled text so it cannot break the HTML parse mode", () => {
    const card = buildArticleCard({
      kind: "article",
      title: "<b>x</b> & y",
      summary: "a < b",
      sources: [],
    });

    expect(card).toContain("<b>&lt;b&gt;x&lt;/b&gt; &amp; y</b>");
    expect(card).toContain("<blockquote expandable>a &lt; b</blockquote>");
    expect(card).not.toContain("Fontes");
  });

  it("labels sources by host, groups repeats and caps the list", () => {
    const sources = [
      "https://www.reddit.com/r/a",
      "https://www.reddit.com/r/b",
      ...["a", "b", "c", "d", "e", "f"].map((h) => `https://${h}.dev/p`),
    ];

    const card = buildArticleCard({
      kind: "article",
      title: "T",
      summary: "S",
      sources,
    });

    expect(card).toContain("<b>Fontes</b> · 8");
    expect(card).toContain(
      '<a href="https://www.reddit.com/r/a">reddit.com</a>',
    );
    expect(card).not.toContain("r/b");
    expect(card).toContain("e.dev");
    expect(card).not.toContain("f.dev");
    expect(card).toContain("+1");
  });

  it("keeps an unparseable source visible instead of dropping it", () => {
    const card = buildArticleCard({
      kind: "report",
      title: "T",
      summary: "S",
      sources: ["not a url"],
    });

    expect(card).toContain("Relatório");
    expect(card).toContain("not a url");
    expect(card).not.toContain('href="not a url"');
  });

  it("never turns a non-web source scheme into a link", () => {
    const card = buildArticleCard({
      kind: "article",
      title: "T",
      summary: "S",
      sources: ["javascript:alert(1)", "tg://resolve?domain=x"],
    });

    expect(card).not.toContain("href=");
    expect(card).toContain("javascript:alert(1)");
  });

  it("omits the quote block when the summary is empty", () => {
    const card = buildArticleCard({
      kind: "article",
      title: "T",
      summary: "  ",
      sources: [],
    });

    expect(card).not.toContain("blockquote");
  });

  it.each([
    [ARTICLE, "https://example.github.io/evo-agent/"],
    ["https://example.com/", "https://example.com/"],
    ["not a url", "not a url"],
  ])("derives the site root of %s", (url, root) => {
    expect(siteRootOf(url)).toBe(root);
  });

  it("reports the Telegram error instead of throwing", async () => {
    post.mockRejectedValue(new Error("boom"));

    const result = await notifyNewArticle("T", ARTICLE, "S");

    expect(result).toEqual({ delivered: false, error: "boom" });
  });
});

describe("telegram model launch card", () => {
  it("previews the model page with a call-to-action button", async () => {
    post.mockResolvedValue({});

    await notifyModelLaunch({
      title: "Model X",
      summary: "Fast",
      url: "https://models.example/x",
      engagement: 1,
      launchedAt: Date.UTC(2026, 8, 29, 12) / 1000,
    });

    const body = post.mock.calls[0][1] as Record<string, unknown>;
    expect(body.text).toContain("Model X");
    expect(body.text).toContain("29/09/2026");
    expect(body.link_preview_options).toMatchObject({
      url: "https://models.example/x",
    });
    expect(body.reply_markup).toEqual({
      inline_keyboard: [
        [{ text: "🔎 Ver modelo", url: "https://models.example/x" }],
      ],
    });
  });
});
