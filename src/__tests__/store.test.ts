import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";

// We test the DB schema and operations directly, bypassing the singleton
// which depends on config.ts (env vars).

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
