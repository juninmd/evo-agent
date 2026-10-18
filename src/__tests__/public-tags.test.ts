import { describe, expect, it } from "vitest";
import type { GeneratedArticle } from "../agent/writer.js";
import { buildPublicationBatch } from "../publisher/github.js";
import { publicTags } from "../publisher/public-tags.js";

const article = (tags: string[]): GeneratedArticle => ({
  title: "Edição de teste",
  slug: "edicao-de-teste",
  content: "# Conteúdo",
  summary: "Resumo suficientemente completo para publicação.",
  tags,
  date: "2026-10-17",
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

describe("publicTags", () => {
  it("drops the launch epoch and the post marker, keeps topics in order", () => {
    expect(
      publicTags(["agents", "launched-1792204838", "post-signals", "codex"]),
    ).toEqual(["agents", "codex"]);
  });

  it("keeps tags that merely resemble internal ones", () => {
    expect(publicTags(["launched", "launched-soon", "post-signals-x"])).toEqual(
      ["launched", "launched-soon", "post-signals-x"],
    );
  });

  it("tolerates a missing list", () => {
    expect(publicTags()).toEqual([]);
  });
});

// Reader-visible bug: "Tags: ..., launched-1792204838, post-signals, ..." on the
// article header and in the archive's search text.
describe("published tags", () => {
  const target = { owner: "owner", repo: "repo", branch: "gh-pages" };
  const noisy = ["agents", "launched-1792204838", "post-signals"];

  it("keeps internal tags out of the article front matter and the index", () => {
    const batch = buildPublicationBatch(
      [{ article: article(noisy), reportPeriod: false }],
      [],
      target,
    );
    const page = batch.files.find((f) => f.path.startsWith("articles/"));
    const index = batch.files.find((f) => f.path === "index.md");
    expect(page?.content).toContain('tags: ["agents"]');
    for (const file of [page, index]) {
      expect(file?.content).not.toContain("launched-");
      expect(file?.content).not.toContain("post-signals");
    }
  });

  it("also cleans items already stored with the raw tags", () => {
    const batch = buildPublicationBatch(
      [{ article: article(["agents"]), reportPeriod: false }],
      [
        {
          slug: "antiga",
          title: "Antiga",
          url: "https://owner.github.io/repo/articles/2026-10-01-antiga",
          date: "2026-10-01",
          summary: "Resumo antigo.",
          tags: noisy,
          kind: "article",
        } as never,
      ],
      target,
    );
    const index = batch.files.find((f) => f.path === "index.md");
    expect(index?.content).toContain("Antiga");
    expect(index?.content).not.toContain("launched-");
  });
});
