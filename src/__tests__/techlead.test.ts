import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-techlead-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "techlead.db"), timezone: "America/Sao_Paulo" },
}));

const { db, getDb } = await import("../knowledge/store.js");
const {
  TECHLEAD_MAX_ITEMS,
  generateTechleadDigest,
  techleadCandidates,
  validateReading,
} = await import("../agent/techlead.js");
const { TECHLEAD_SOURCES } = await import("../crawler/techlead-sources.js");
type Article = import("../knowledge/store.js").Article;

afterAll(() => {
  // Windows keeps the file locked while the SQLite handle is open.
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

function article(overrides: Partial<Article>): Article {
  return {
    id: 1,
    title: "Bun v1.3.0",
    source: "Techlead: Bun Releases",
    url: "https://github.com/oven-sh/bun/releases/tag/bun-v1.3.0",
    summary: "Novo bundler e fix de seguranca no fetch.",
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-09-10T10:00:00Z",
    ...overrides,
  };
}

function item(url: string, action = "testar") {
  return `### Item\n**O que mudou:** x\n**Por que importa:** y\n**Acao:** ${action}\nFonte: ${url}`;
}

describe("techlead source isolation", () => {
  it("keeps stack feeds out of the AI editions and LiteLLM in both", () => {
    const save = (source: string, url: string) =>
      db.saveArticle({ title: url, source, url, summary: "s", tags: "[]" });
    save("Anthropic News", "https://a.example/ai");
    save("Techlead: Bun Releases", "https://a.example/bun");
    save("LiteLLM Releases", "https://a.example/litellm");

    const ai = db.getArticlesSince(1).map((row) => row.source);
    expect(ai).toContain("Anthropic News");
    expect(ai).toContain("LiteLLM Releases");
    expect(ai).not.toContain("Techlead: Bun Releases");
    const between = db
      .getArticlesBetween("2000-01-01T00:00:00Z", "2100-01-01T00:00:00Z")
      .map((row) => row.source);
    expect(between).not.toContain("Techlead: Bun Releases");
    expect(
      db
        .getTechleadArticlesSince(1)
        .map((row) => row.source)
        .sort(),
    ).toEqual(["LiteLLM Releases", "Techlead: Bun Releases"]);
  });

  it("every techlead feed carries the prefix the isolation depends on", () => {
    for (const source of TECHLEAD_SOURCES) {
      expect(source.name.startsWith("Techlead: ")).toBe(true);
      expect(source.url.startsWith("https://")).toBe(true);
    }
  });
});

describe("techleadCandidates", () => {
  it("drops prereleases and duplicates, caps and interleaves sources", () => {
    const bun = (n: number) =>
      article({ id: n, title: `Bun v1.${n}.0`, url: `https://b/${n}` });
    const candidates = techleadCandidates([
      bun(1),
      bun(2),
      bun(3),
      bun(4),
      bun(4),
      article({
        title: "v1.34.0-rc.1+k3s1",
        source: "Techlead: k3s Releases",
        url: "https://k/rc",
      }),
      article({
        title: "React canary",
        source: "Techlead: React Blog",
        url: "https://r/c",
      }),
      article({
        title: "Staff+",
        source: "Techlead: LeadDev",
        url: "https://l/1",
      }),
    ]);
    expect(candidates.map((row) => row.url)).toEqual([
      "https://b/1",
      "https://l/1",
      "https://b/2",
      "https://b/3",
    ]);
  });
});

describe("validateReading", () => {
  const pool = [
    article({ url: "https://b/1" }),
    article({ url: "https://b/2" }),
  ];

  it("accepts a reading that cites only the pool", () => {
    expect(validateReading(item("https://b/1"), pool)).not.toBeNull();
  });

  it("rejects an invented URL even when the format is right", () => {
    expect(validateReading(item("https://b/404"), pool)).toBeNull();
  });

  it("rejects more items than the reading budget", () => {
    const tooMany = Array.from({ length: TECHLEAD_MAX_ITEMS + 1 }, () =>
      item("https://b/1"),
    ).join("\n\n");
    expect(validateReading(tooMany, pool)).toBeNull();
  });

  it("rejects an item without an action", () => {
    expect(validateReading("### Item\nFonte: https://b/1", pool)).toBeNull();
  });
});

describe("generateTechleadDigest", () => {
  const pool = Array.from({ length: 8 }, (_, n) =>
    article({ source: `Techlead: S${n}`, url: `https://s/${n}` }),
  );
  const run = (ask: () => Promise<string>, load = () => pool) =>
    generateTechleadDigest(new Date(), { load, ask });

  it("publishes the model reading and cites what it chose", async () => {
    const digest = await run(async () => item("https://s/2"));
    expect(digest.content).toContain("**Acao:** testar");
    expect(digest.sources).toEqual(["https://s/2"]);
    expect(digest.reportPeriod).toBe("techlead");
  });

  it("falls back to the ranking when the model invents a source", async () => {
    const digest = await run(async () => item("https://evil.example/x"));
    expect(digest.content).not.toContain("evil.example");
    expect(digest.content.match(/^### /gm)).toHaveLength(TECHLEAD_MAX_ITEMS);
    expect(digest.sources).toHaveLength(TECHLEAD_MAX_ITEMS);
  });

  it("still publishes when the model is down", async () => {
    const digest = await run(async () => {
      throw new Error("LLM unavailable");
    });
    expect(digest.sources).toHaveLength(TECHLEAD_MAX_ITEMS);
  });

  it("fails loud when the crawler brought nothing in the week", async () => {
    let asked = false;
    const ask = async () => {
      asked = true;
      return "";
    };
    await expect(run(ask, () => [])).rejects.toThrow(/no articles/);
    expect(asked).toBe(false);
  });
});
