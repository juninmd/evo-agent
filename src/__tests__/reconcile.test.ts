import type { Octokit } from "@octokit/rest";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { GeneratedArticle } from "../agent/types.js";
import { db, getDb } from "../knowledge/store.js";
import { retractEdition } from "../publisher/lifecycle.js";
import {
  parseEditionPage,
  reconcilePublished,
} from "../publisher/reconcile.js";
import { buildMarkdown } from "../publisher/site-renderer.js";

afterAll(() => getDb().close());

const target = { owner: "o", repo: "r", branch: "gh-pages" };

const article = (over: Partial<GeneratedArticle> = {}): GeneratedArticle => ({
  title: 'Claude "Code" ganha \\ memória',
  slug: "claude-code",
  content: "# T\n\ncorpo",
  summary: 'Resumo com "aspas" e acento: ação.',
  tags: ["claude code", "mcp"],
  date: "2026-10-20",
  sources: [],
  evidence: [],
  editorialMetrics: {
    considered: 1,
    selected: 1,
    rejected: 0,
    buckets: {},
    primarySources: 0,
  },
  ...over,
});

describe("parseEditionPage", () => {
  it("round-trips what buildMarkdown writes, escapes included", () => {
    const original = article();
    const parsed = parseEditionPage(
      target,
      "articles/2026-10-20-claude-code.md",
      buildMarkdown(original),
    );
    expect(parsed).toMatchObject({
      slug: "2026-10-20-claude-code",
      title: original.title,
      summary: original.summary,
      date: "2026-10-20",
      kind: "article",
      url: "https://o.github.io/r/articles/2026-10-20-claude-code",
      notificationStatus: "suppressed",
    });
    expect(parsed?.tags).toEqual(["claude code", "mcp"]);
  });

  it("reads the period of a report from its file name", () => {
    const parsed = parseEditionPage(
      target,
      "reports/radar-2026-10-19-radar-2026-10-19.md",
      buildMarkdown(article({ date: "2026-10-19" })),
    );
    expect(parsed).toMatchObject({ kind: "report", period: "radar" });
  });

  it("ignores other files, broken front matter and retraction notices", () => {
    const md = buildMarkdown(article());
    expect(parseEditionPage(target, "index.md", md)).toBeNull();
    expect(
      parseEditionPage(target, "articles/x.md", "sem front matter"),
    ).toBeNull();
    expect(
      parseEditionPage(
        target,
        "articles/2026-10-20-x.md",
        buildMarkdown(article({ summary: "Edição retirada em 2026-10-21." })),
      ),
    ).toBeNull();
  });
});

function fakeClient(files: Record<string, string>) {
  const getContent = vi.fn(async ({ path }: { path: string }) => ({
    data: { content: Buffer.from(files[path] ?? "").toString("base64") },
  }));
  const client = {
    git: {
      getRef: vi.fn().mockResolvedValue({ data: { object: { sha: "head" } } }),
      getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: "tree" } } }),
      getTree: vi.fn().mockResolvedValue({
        data: {
          truncated: false,
          tree: [
            ...Object.keys(files).map((path) => ({ type: "blob", path })),
            { type: "blob", path: "index.md" },
            { type: "tree", path: "articles" },
          ],
        },
      }),
    },
    repos: { getContent },
  };
  return {
    client: client as unknown as Pick<Octokit, "git" | "repos">,
    getContent,
  };
}

describe("reconcilePublished", () => {
  it("registers only pages the database does not know, without a ping", async () => {
    const known = "articles/2026-10-20-known.md";
    const lost = "articles/2026-10-20-lost.md";
    const { client, getContent } = fakeClient({
      [known]: buildMarkdown(article({ slug: "known" })),
      [lost]: buildMarkdown(article({ slug: "lost", title: "Edição perdida" })),
    });

    db.savePublished({
      slug: "2026-10-20-known",
      title: "Já registrada",
      url: "https://o.github.io/r/articles/2026-10-20-known",
      date: "2026-10-20",
      summary: "",
      tags: [],
      kind: "article",
    });

    const restored = await reconcilePublished(client, target);

    expect(restored).toBe(1);
    expect(getContent).toHaveBeenCalledTimes(1);
    expect(db.getPublishedBySlug("2026-10-20-lost")).toMatchObject({
      title: "Edição perdida",
      notification_status: "suppressed",
    });
    expect(db.countPublishedOn("article", "2026-10-20")).toBe(2);

    // Idempotent once registered.
    expect(await reconcilePublished(client, target)).toBe(0);
  });
});

describe("retractEdition", () => {
  function commitClient(failTree = false) {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob" } });
    const createTree = failTree
      ? vi.fn().mockRejectedValue(new Error("tree failed"))
      : vi.fn().mockResolvedValue({ data: { sha: "next" } });
    const client = {
      repos: { getContent: vi.fn().mockRejectedValue({ status: 404 }) },
      git: {
        getRef: vi
          .fn()
          .mockResolvedValue({ data: { object: { sha: "head" } } }),
        getCommit: vi
          .fn()
          .mockResolvedValue({ data: { tree: { sha: "base" } } }),
        createBlob,
        createTree,
        createCommit: vi.fn().mockResolvedValue({ data: { sha: "c" } }),
        updateRef: vi.fn().mockResolvedValue({}),
      },
    };
    return {
      client: client as unknown as Pick<Octokit, "git" | "repos">,
      createBlob,
    };
  }

  function seed(slug: string) {
    db.savePublished({
      slug,
      title: `Título ${slug}`,
      url: `https://o.github.io/r/articles/${slug}`,
      date: "2026-10-22",
      summary: "resumo",
      tags: ["ai"],
      kind: "article",
      content: "original",
    });
  }

  it("commits the notice and a rebuilt home, then marks the row", async () => {
    seed("2026-10-22-sai");
    seed("2026-10-22-fica");
    const { client, createBlob } = commitClient();

    await retractEdition("2026-10-22-sai", "sem fonte", "2026-10-23", {
      target,
      client,
    });

    const blobs = createBlob.mock.calls.map(([arg]) => arg.content as string);
    const notice = blobs.find((b) =>
      b.includes("Edição retirada em 2026-10-23"),
    );
    expect(notice).toContain("sitemap: false");
    expect(notice).toContain("sem fonte");
    const index = blobs.find((b) => b.includes("layout: home")) ?? "";
    expect(index).toContain("Título 2026-10-22-fica");
    expect(index).not.toContain("Título 2026-10-22-sai");
    expect(db.getPublishedBySlug("2026-10-22-sai")?.status).toBe("retracted");
  });

  it("leaves the database untouched when the commit fails", async () => {
    seed("2026-10-22-falha");
    const { client } = commitClient(true);

    await expect(
      retractEdition("2026-10-22-falha", "x", "2026-10-23", { target, client }),
    ).rejects.toThrow("tree failed");
    expect(db.getPublishedBySlug("2026-10-22-falha")?.status).toBe("published");
  });

  it("refuses unknown and already retracted editions", async () => {
    const { client } = commitClient();
    await expect(
      retractEdition("nope", "x", "2026-10-23", { target, client }),
    ).rejects.toThrow("Unknown edition");
    await expect(
      retractEdition("2026-10-22-sai", "x", "2026-10-23", { target, client }),
    ).rejects.toThrow("already retracted");
  });
});
