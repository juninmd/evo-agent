import type { Octokit } from "@octokit/rest";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedArticle } from "../agent/types.js";
import { buildPublicationBatch, commitFiles } from "../publisher/github.js";

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

    expect(batch.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "articles/2026-06-01-retroativo-1.md",
        "articles/2026-06-02-retroativo-2.md",
        "index.md",
      ]),
    );
    expect(batch.items).toHaveLength(2);
  });
});
