import type { Octokit } from "@octokit/rest";
import { describe, expect, it, vi } from "vitest";
import { commitFiles } from "../publisher/github.js";

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
});
