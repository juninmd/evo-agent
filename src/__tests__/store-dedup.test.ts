import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-dedup-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "dedup.db"), timezone: "America/Sao_Paulo" },
}));

const { db, getDb, migrate } = await import("../knowledge/store.js");

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  getDb().exec("DELETE FROM articles;");
});

const base = { source: "Feed", summary: "s", tags: "[]" };

describe("article URL dedup", () => {
  it("treats a www/slash/tracking variant of a stored URL as already seen", () => {
    db.saveArticle({ ...base, title: "A", url: "https://example.com/post" });
    expect(
      db.urlExists("https://www.example.com/post/?utm_source=rss&utm_medium=x"),
    ).toBe(true);
  });

  it("stores one row when the same story arrives with different tracking", () => {
    db.saveArticle({
      ...base,
      title: "A",
      url: "https://example.com/p?utm_source=a",
    });
    db.saveArticle({
      ...base,
      title: "A",
      url: "https://example.com/p?utm_source=b",
    });
    const rows = getDb().prepare("SELECT url FROM articles").all();
    expect(rows).toEqual([{ url: "https://example.com/p" }]);
  });

  it("keeps the link readers click: www and trailing slash are not rewritten", () => {
    db.saveArticle({
      ...base,
      title: "A",
      url: "https://www.only-www.example/p/?utm_source=a",
    });
    const rows = getDb().prepare("SELECT url FROM articles").all();
    expect(rows).toEqual([{ url: "https://www.only-www.example/p/" }]);
  });

  it("still finds rows stored before url_key existed by their raw URL", () => {
    getDb()
      .prepare(
        "INSERT INTO articles (title, source, url) VALUES ('A','Feed',?)",
      )
      .run("https://example.com/p?utm_source=legacy");
    expect(db.urlExists("https://example.com/p?utm_source=legacy")).toBe(true);
  });

  it("backfills url_key for legacy rows on migrate", () => {
    getDb()
      .prepare(
        "INSERT INTO articles (title, source, url) VALUES ('A','Feed',?)",
      )
      .run("https://www.example.com/legacy/");
    migrate(getDb());
    expect(db.urlExists("https://example.com/legacy")).toBe(true);
  });
});
