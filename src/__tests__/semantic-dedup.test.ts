import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { curateArticles } from "../agent/curation.js";
import type { Article } from "../knowledge/store.js";
import { cosine } from "../utils/vector.js";

const dir = mkdtempSync(join(tmpdir(), "evo-semantic-"));
vi.mock("../config.js", () => ({
  config: {
    dbPath: join(dir, "semantic.db"),
    timezone: "America/Sao_Paulo",
    embedding: {
      model: "test-embed",
      timeoutMs: 1000,
      duplicateThreshold: 0.88,
    },
    litellm: { apiBase: "http://localhost:1/v1", apiKey: "k" },
  },
}));

const { getDb } = await import("../knowledge/store.js");
const { vectorsFor, semanticContext } = await import(
  "../agent/semantic-dedup.js"
);
const { embedTexts, resetEmbeddingCircuit } = await import(
  "../utils/embeddings.js"
);

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  getDb().exec("DELETE FROM article_embeddings; DELETE FROM articles;");
  resetEmbeddingCircuit();
});

function article(title: string, url: string, source = "Some Blog"): Article {
  return {
    id: 1,
    title,
    source,
    url,
    summary: `Resumo detalhado e relevante sobre ${title}, com contexto técnico suficiente para passar o filtro de informação.`,
    tags: '["ai"]',
    engagement_score: 0,
    crawled_at: "2026-06-12T10:00:00Z",
  };
}

const v = (...n: number[]) => Float32Array.from(n);

describe("cosine", () => {
  it("is 1 for parallel, 0 for orthogonal and 0 for degenerate input", () => {
    expect(cosine(v(1, 2), v(2, 4))).toBeCloseTo(1);
    expect(cosine(v(1, 0), v(0, 1))).toBe(0);
    expect(cosine(v(0, 0), v(1, 1))).toBe(0);
    expect(cosine(v(1), v(1, 1))).toBe(0);
  });
});

describe("curateArticles with embeddings", () => {
  const a = article(
    "Lançamento do modelo Zeta chega ao mercado",
    "https://a.example/1",
  );
  const b = article(
    "Empresa apresenta novidade para devs em nuvem",
    "https://b.example/2",
  );

  it("merges stories whose titles share no words but whose vectors match", () => {
    const vectors = new Map([
      [a.url, v(1, 0.1)],
      [b.url, v(1, 0.12)],
    ]);
    const result = curateArticles([a, b], { vectors });
    expect(result.selected).toHaveLength(1);
    expect(result.rejected.map((r) => r.reason)).toEqual(["duplicate-story"]);
  });

  it("keeps both when the vectors differ", () => {
    const vectors = new Map([
      [a.url, v(1, 0)],
      [b.url, v(0, 1)],
    ]);
    expect(curateArticles([a, b], { vectors }).selected).toHaveLength(2);
  });

  it("rejects a candidate close to an already published story", () => {
    const vectors = new Map([
      [a.url, v(1, 0)],
      [b.url, v(0, 1)],
    ]);
    const result = curateArticles([a, b], {
      vectors,
      priorVectors: [v(1, 0.05)],
    });
    expect(result.selected.map((s) => s.article.url)).toEqual([b.url]);
    expect(result.rejected).toEqual([{ article: a, reason: "repeat-story" }]);
  });

  it("does not merge a community thread into the release it discusses", () => {
    const thread = article(
      "Thread sobre Zeta",
      "https://reddit.com/r/x/1",
      "Reddit: ClaudeCode",
    );
    const vectors = new Map([
      [a.url, v(1, 0)],
      [thread.url, v(1, 0.01)],
    ]);
    expect(curateArticles([a, thread], { vectors }).selected).toHaveLength(2);
  });

  it("keeps a community follow-up even when a prior edition covered the story", () => {
    const thread = article(
      "Thread sobre Zeta",
      "https://reddit.com/r/x/1",
      "Reddit: ClaudeCode",
    );
    const vectors = new Map([[thread.url, v(1, 0)]]);
    const result = curateArticles([thread], {
      vectors,
      priorVectors: [v(1, 0)],
    });
    expect(result.selected).toHaveLength(1);
  });

  it("behaves as before when there are no vectors", () => {
    expect(curateArticles([a, b], {}).selected).toHaveLength(2);
  });
});

describe("vectorsFor", () => {
  const items = [
    article("Um", "https://x.example/1"),
    article("Dois", "https://x.example/2"),
  ];

  it("embeds only cache misses and persists them", async () => {
    const embed = vi.fn(async (texts: string[]) => texts.map(() => v(1, 2)));
    await vectorsFor([items[0]], embed);
    const all = await vectorsFor(items, embed);
    expect(embed).toHaveBeenCalledTimes(2);
    expect(embed.mock.calls[1][0]).toHaveLength(1);
    expect([...all.keys()].sort()).toEqual(items.map((i) => i.url).sort());
    expect(all.get(items[0].url)).toEqual(v(1, 2));
  });

  it("returns what is cached when the backend fails, without throwing", async () => {
    const ok = vi.fn(async (texts: string[]) => texts.map(() => v(3, 4)));
    await vectorsFor([items[0]], ok);
    const all = await vectorsFor(items, async () => null);
    expect([...all.keys()]).toEqual([items[0].url]);
  });

  it("keeps the batches that landed when a later one fails", async () => {
    const many = Array.from({ length: 70 }, (_, i) =>
      article(`T${i}`, `https://many.example/${i}`),
    );
    let calls = 0;
    const embed = async (texts: string[]) =>
      ++calls === 1 ? texts.map(() => v(1, 1)) : null;
    const first = await vectorsFor(many, embed);
    expect(first.size).toBe(64);
    // The 64 persisted vectors are served from cache; only the rest is retried.
    const embedAgain = vi.fn(async (texts: string[]) =>
      texts.map(() => v(2, 2)),
    );
    const second = await vectorsFor(many, embedAgain);
    expect(embedAgain.mock.calls[0][0]).toHaveLength(6);
    expect(second.size).toBe(70);
  });

  it("discards a batch whose size does not match", async () => {
    const all = await vectorsFor(items, async () => [v(1)]);
    expect(all.size).toBe(0);
  });
});

describe("semanticContext", () => {
  it("embeds recently used articles as prior stories", async () => {
    const used = article("Já publicado", "https://used.example/1");
    getDb()
      .prepare(
        "INSERT INTO articles (title, source, url, summary) VALUES (?,?,?,?)",
      )
      .run(used.title, used.source, used.url, used.summary);
    const cand = article("Candidato", "https://cand.example/1");
    const ctx = await semanticContext([cand], [used.url], async (t) =>
      t.map(() => v(5, 5)),
    );
    expect(ctx.priorVectors).toHaveLength(1);
    expect(ctx.vectors.has(cand.url)).toBe(true);
  });
});

describe("embedTexts", () => {
  it("returns null instead of throwing when the backend is down, then skips for a while", async () => {
    // Port 1 refuses the connection, so the first call fails fast.
    expect(await embedTexts(["a"])).toBeNull();
    const started = Date.now();
    expect(await embedTexts(["b"])).toBeNull();
    expect(Date.now() - started).toBeLessThan(50);
  });

  it("returns an empty list for no input", async () => {
    expect(await embedTexts([])).toEqual([]);
  });
});
