import type { Octokit } from "@octokit/rest";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedArticle } from "../agent/types.js";
import type { PublishedArticle } from "../knowledge/store.js";
import { buildPublicationBatch, commitFiles } from "../publisher/github.js";
import { buildEbookMarkdown } from "../publisher/site-renderer.js";

function githubClient(options: { failTree?: boolean } = {}) {
  const updateRef = vi.fn().mockResolvedValue({});
  const client = {
    repos: {
      getContent: vi.fn().mockRejectedValue({ status: 404 }),
    },
    git: {
      getRef: vi.fn().mockResolvedValue({ data: { object: { sha: "head" } } }),
      getCommit: vi
        .fn()
        .mockResolvedValue({ data: { tree: { sha: "base-tree" } } }),
      createBlob: vi
        .fn()
        .mockResolvedValueOnce({ data: { sha: "blob-1" } })
        .mockResolvedValueOnce({ data: { sha: "blob-2" } }),
      createTree: options.failTree
        ? vi.fn().mockRejectedValue(new Error("tree failed"))
        : vi.fn().mockResolvedValue({ data: { sha: "next-tree" } }),
      createCommit: vi.fn().mockResolvedValue({ data: { sha: "commit" } }),
      updateRef,
    },
  };
  return {
    client: client as unknown as Pick<Octokit, "git" | "repos">,
    updateRef,
    createCommit: client.git.createCommit,
  };
}

describe("atomic GitHub publication", () => {
  it("moves the branch only after creating the complete commit", async () => {
    const { client, updateRef, createCommit } = githubClient();

    await commitFiles(
      "owner",
      "repo",
      "gh-pages",
      [
        { path: "article.md", content: "article" },
        { path: "index.md", content: "index" },
      ],
      "article: test",
      client,
    );

    expect(createCommit).toHaveBeenCalledOnce();
    expect(updateRef).toHaveBeenCalledOnce();
    expect(createCommit.mock.invocationCallOrder[0]).toBeLessThan(
      updateRef.mock.invocationCallOrder[0],
    );
  });

  it("does not move the branch when tree creation fails", async () => {
    const { client, updateRef } = githubClient({ failTree: true });

    await expect(
      commitFiles(
        "owner",
        "repo",
        "gh-pages",
        [{ path: "article.md", content: "article" }],
        "article: test",
        client,
      ),
    ).rejects.toThrow("tree failed");

    expect(updateRef).not.toHaveBeenCalled();
  });

  it("uploads binary assets with their encoding instead of as UTF-8 text", async () => {
    const { client } = githubClient();

    await commitFiles(
      "owner",
      "repo",
      "gh-pages",
      [
        { path: "a.md", content: "text" },
        { path: "a.png", content: "iVBORw0KGgo=", encoding: "base64" },
      ],
      "assets: test",
      client,
    );

    const blobs = vi.mocked(client.git.createBlob).mock.calls.map((c) => c[0]);
    expect(blobs).toEqual([
      expect.objectContaining({ content: "text", encoding: "utf-8" }),
      expect.objectContaining({ content: "iVBORw0KGgo=", encoding: "base64" }),
    ]);
  });

  it("builds one atomic batch for multiple historical articles", () => {
    const generated = (date: string, slug: string): GeneratedArticle => ({
      title: `Edição ${date}`,
      slug,
      content: "# Conteúdo",
      summary: "Resumo histórico suficientemente completo para publicação.",
      tags: ["backfill"],
      date,
      sources: ["https://example.com/source"],
      evidence: [
        {
          sourceUrl: "https://example.com/source",
          sourceTitle: "Fonte",
          excerpt: "Trecho factual suficientemente detalhado para auditoria.",
        },
      ],
      editorialMetrics: {
        considered: 4,
        selected: 1,
        rejected: 3,
        buckets: { official: 1 },
        primarySources: 1,
      },
    });

    const batch = buildPublicationBatch(
      [
        {
          article: generated("2026-06-01", "retroativo-1"),
          reportPeriod: false,
        },
        {
          article: generated("2026-06-02", "retroativo-2"),
          reportPeriod: false,
        },
      ],
      [],
      { owner: "owner", repo: "repo", branch: "gh-pages" },
    );

    const feed = batch.files.find((file) => file.path === "feed.xml");
    expect(feed?.content.match(/<entry>/g)).toHaveLength(2);
    expect(feed?.content).toContain(
      "https://owner.github.io/repo/articles/2026-06-02-retroativo-2",
    );

    expect(batch.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "articles/2026-06-01-retroativo-1.md",
        "articles/2026-06-02-retroativo-2.md",
        "index.md",
      ]),
    );
    expect(
      batch.files.find((file) => file.path === "index.md")?.content,
    ).toContain("/handbooks/ai-dev-handbook");
    expect(batch.items).toHaveLength(2);
  });

  it("renders ebook markdown as a publishable Jekyll article", () => {
    const markdown = buildEbookMarkdown({
      title: "Guia Prático: Desenvolvimento de Software com IA",
      summary: "Compêndio vivo de práticas.",
      date: "2026-06-26",
      markdown:
        "# Guia Prático: Desenvolvimento de Software com IA\n\n## Ferramentas\n\n- Use fontes.",
    });

    expect(markdown).toContain('tags: ["ebook"');
    expect(markdown).toContain("{% raw %}");
    expect(markdown).toContain("## Ferramentas");
  });
});

describe("archive and lifecycle in the publication batch", () => {
  const target = { owner: "owner", repo: "repo", branch: "gh-pages" };

  const article = (date: string, slug: string): GeneratedArticle => ({
    title: `Edição ${slug}`,
    slug,
    content: "# Conteúdo",
    summary: "Resumo suficientemente completo para publicação.",
    tags: ["ai"],
    date,
    sources: ["https://example.com/s"],
    evidence: [
      {
        sourceUrl: "https://example.com/s",
        sourceTitle: "Fonte",
        excerpt: "Trecho factual suficientemente detalhado para auditoria.",
      },
    ],
    editorialMetrics: {
      considered: 10,
      selected: 1,
      rejected: 9,
      buckets: { official: 1 },
      primarySources: 1,
    },
  });

  const row = (n: number, status: PublishedArticle["status"] = "published") =>
    ({
      slug: `old-${n}`,
      title: `Antiga ${n}`,
      url: `https://owner.github.io/repo/articles/2026-01-01-old-${n}`,
      date: "2026-01-01",
      summary: "resumo",
      tags: ["ai"],
      kind: "article",
      status,
    }) as PublishedArticle;

  it("keeps every published edition in the index instead of the newest 80", () => {
    const published = Array.from({ length: 130 }, (_, n) => row(n));
    const { files } = buildPublicationBatch(
      [{ article: article("2026-06-01", "nova"), reportPeriod: false }],
      published,
      target,
    );
    const index = files.find((file) => file.path === "index.md")?.content;
    expect(index?.match(/class="story-card"|<li data-search/g)).toHaveLength(
      131 - 1,
    );
    expect(index).toContain("Antiga 129");
    expect(index).toContain("<strong>131</strong> edições");
  });

  it("drops a retracted edition from the index and the feed", () => {
    const { files } = buildPublicationBatch(
      [{ article: article("2026-06-01", "nova"), reportPeriod: false }],
      [row(1), row(2, "retracted")],
      target,
    );
    const index = files.find((file) => file.path === "index.md")?.content;
    const feed = files.find((file) => file.path === "feed.xml")?.content;
    expect(index).toContain("Antiga 1");
    expect(index).not.toContain("Antiga 2");
    expect(feed).not.toContain("old-2");
  });

  it("saves a date-qualified slug, the committed body and a quality score", () => {
    const { items } = buildPublicationBatch(
      [{ article: article("2026-06-01", "mesmo-titulo"), reportPeriod: false }],
      [],
      target,
    );
    expect(items[0].saved.slug).toBe("2026-06-01-mesmo-titulo");
    expect(items[0].saved.content).toBe(items[0].file.content);
    expect(items[0].saved.qualityScore).toEqual(expect.any(Number));
  });
});
