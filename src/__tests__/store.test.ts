import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it, vi } from "vitest";

// We test the DB schema and operations directly, bypassing the singleton
// which depends on config.ts (env vars).
vi.mock("../config.js", () => ({
  config: { dbPath: join(tmpdir(), "evo-test-config-unused.db") },
}));

let db: Database.Database;
const testDbPath = join(tmpdir(), `evo-test-${Date.now()}.db`);

beforeAll(() => {
  mkdirSync(join(tmpdir()), { recursive: true });
  db = new Database(testDbPath);
  db.pragma("journal_mode = WAL");

  // Replicate the migration from store.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      summary TEXT,
      tags TEXT DEFAULT '[]',
      engagement_score INTEGER DEFAULT 0,
      crawled_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'typescript',
      code TEXT NOT NULL,
      explanation TEXT,
      source_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS published_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      published_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_crawled_at
      ON articles(crawled_at);
    CREATE INDEX IF NOT EXISTS idx_articles_engagement
      ON articles(engagement_score DESC);
  `);
});

describe("Database schema - engagement_score column", () => {
  it("allows inserting articles with engagement_score", () => {
    const stmt = db.prepare(
      `INSERT INTO articles (title, source, url, summary, tags, engagement_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      "Test Article",
      "Hacker News",
      "https://test.com/1",
      "Summary",
      '["test"]',
      150,
    );
    stmt.run(
      "Test Article 2",
      "Reddit",
      "https://test.com/2",
      "Summary 2",
      '["test"]',
      42,
    );

    const articles = db
      .prepare(
        "SELECT title, engagement_score FROM articles ORDER BY engagement_score DESC",
      )
      .all() as Array<{ title: string; engagement_score: number }>;

    expect(articles).toHaveLength(2);
    expect(articles[0].engagement_score).toBe(150);
    expect(articles[1].engagement_score).toBe(42);
  });

  it("defaults engagement_score to 0 when not specified", () => {
    const stmt = db.prepare(
      `INSERT INTO articles (title, source, url, summary, tags)
       VALUES (?, ?, ?, ?, ?)`,
    );
    stmt.run(
      "No Score Article",
      "Google News",
      "https://test.com/3",
      "Summary",
      '["test"]',
    );

    const row = db
      .prepare("SELECT engagement_score FROM articles WHERE url = ?")
      .get("https://test.com/3") as { engagement_score: number };

    expect(row.engagement_score).toBe(0);
  });

  it("supports querying by engagement_score DESC", () => {
    const rows = db
      .prepare(
        "SELECT engagement_score FROM articles ORDER BY engagement_score DESC",
      )
      .all() as Array<{ engagement_score: number }>;

    const scores = rows.map((r) => r.engagement_score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("url uniqueness constraint works", () => {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO articles (title, source, url, summary, tags, engagement_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    // Insert same URL again - should be ignored
    const result = stmt.run(
      "Duplicate",
      "Source",
      "https://test.com/1",
      "Dup",
      "[]",
      999,
    );
    expect(result.changes).toBe(0);
  });
});

describe("Database - agent_state", () => {
  it("stores and retrieves state", () => {
    db.prepare(
      `INSERT INTO agent_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ).run("search_keywords", '["AI","LLM"]');

    const row = db
      .prepare("SELECT value FROM agent_state WHERE key = ?")
      .get("search_keywords") as { value: string };

    expect(row.value).toBe('["AI","LLM"]');
  });

  it("updates existing state", () => {
    db.prepare(
      `INSERT INTO agent_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ).run("search_keywords", '["updated"]');

    const row = db
      .prepare("SELECT value FROM agent_state WHERE key = ?")
      .get("search_keywords") as { value: string };

    expect(row.value).toBe('["updated"]');
  });
});

describe("migrate - legacy database without engagement_score", () => {
  it("adds the engagement_score column to pre-existing databases", async () => {
    const { migrate } = await import("../knowledge/store.js");
    const legacyDbPath = join(tmpdir(), `evo-test-legacy-${Date.now()}.db`);
    const legacyDb = new Database(legacyDbPath);
    // Old production schema: articles table without engagement_score
    legacyDb.exec(`
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        summary TEXT,
        tags TEXT DEFAULT '[]',
        crawled_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE published_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        published_at TEXT DEFAULT (datetime('now'))
      );
    `);
    legacyDb
      .prepare("INSERT INTO articles (title, source, url) VALUES (?, ?, ?)")
      .run("Old Article", "RSS", "https://legacy.test/1");
    legacyDb
      .prepare(
        "INSERT INTO published_articles (slug, title, url) VALUES (?, ?, ?)",
      )
      .run("legacy-article", "Legacy Article", "https://legacy.test/article");

    migrate(legacyDb);

    const row = legacyDb
      .prepare("SELECT engagement_score FROM articles WHERE url = ?")
      .get("https://legacy.test/1") as { engagement_score: number };
    expect(row.engagement_score).toBe(0);
    const tables = legacyDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        "cycle_runs",
        "metric_events",
        "prompt_versions",
        "published_evidence",
        "source_health",
      ]),
    );
    const publishedColumns = legacyDb
      .prepare("PRAGMA table_info(published_articles)")
      .all() as Array<{ name: string }>;
    expect(publishedColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "date",
        "kind",
        "notification_status",
        "notification_attempts",
        "next_notification_at",
        "notification_error",
        "editorial_metrics",
      ]),
    );
    const legacyPublished = legacyDb
      .prepare(
        "SELECT notification_status, notification_error FROM published_articles WHERE slug = ?",
      )
      .get("legacy-article") as {
      notification_status: string;
      notification_error: string;
    };
    expect(legacyPublished).toEqual({
      notification_status: "delivered",
      notification_error: "legacy record migrated without notification state",
    });

    // Idempotent: running again must not throw
    migrate(legacyDb);

    legacyDb.close();
    rmSync(legacyDbPath, { force: true });
  });
});

describe("Database - published_articles", () => {
  it("stores and deduplicates published articles", () => {
    db.prepare(
      "INSERT OR IGNORE INTO published_articles (slug, title, url) VALUES (?, ?, ?)",
    ).run("test-article", "Test Article", "https://example.com/test");

    // Duplicate slug should be ignored
    const result = db
      .prepare(
        "INSERT OR IGNORE INTO published_articles (slug, title, url) VALUES (?, ?, ?)",
      )
      .run("test-article", "Different Title", "https://example.com/different");

    expect(result.changes).toBe(0);
  });
});

describe("historical article queries", () => {
  it("excludes articles at and after the historical upper bound", () => {
    const rows = db
      .prepare(
        `SELECT * FROM articles
         WHERE crawled_at >= ? AND crawled_at < ?
         ORDER BY crawled_at DESC`,
      )
      .all("2026-06-01T00:00:00Z", "2026-06-02T00:00:00Z") as Array<{
      crawled_at: string;
    }>;

    expect(rows.every((row) => row.crawled_at < "2026-06-02T00:00:00Z")).toBe(
      true,
    );
  });
});
