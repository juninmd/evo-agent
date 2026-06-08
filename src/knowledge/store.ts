import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

export interface Article {
  id: number;
  title: string;
  source: string;
  url: string;
  summary: string;
  tags: string;
  engagement_score: number;
  crawled_at: string;
}

export interface Snippet {
  id: number;
  title: string;
  language: string;
  code: string;
  explanation: string;
  source_url: string;
  created_at: string;
}

export interface AgentState {
  key: string;
  value: string;
  updated_at: string;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(config.dbPath), { recursive: true });
  _db = new Database(config.dbPath);
  _db.pragma("journal_mode = WAL");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
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
}

export interface SaveArticleInput {
  title: string;
  source: string;
  url: string;
  summary: string;
  tags: string;
  engagement_score?: number;
}

export const db = {
  saveArticle(a: SaveArticleInput) {
    const stmt = getDb().prepare(
      `INSERT OR IGNORE INTO articles (title, source, url, summary, tags, engagement_score)
       VALUES (@title, @source, @url, @summary, @tags, @engagement_score)`,
    );
    return stmt.run({
      title: a.title,
      source: a.source,
      url: a.url,
      summary: a.summary,
      tags: a.tags,
      engagement_score: a.engagement_score ?? 0,
    });
  },

  getRecentArticles(limit = 50): Article[] {
    return getDb()
      .prepare("SELECT * FROM articles ORDER BY crawled_at DESC LIMIT ?")
      .all(limit) as Article[];
  },

  getArticlesSince(days: number, limit = 2000): Article[] {
    return getDb()
      .prepare(
        "SELECT * FROM articles WHERE crawled_at >= datetime('now', ?) ORDER BY crawled_at DESC LIMIT ?",
      )
      .all(`-${days} days`, limit) as Article[];
  },

  urlExists(url: string): boolean {
    const row = getDb()
      .prepare("SELECT 1 FROM articles WHERE url = ?")
      .get(url);
    return !!row;
  },

  saveSnippet(s: Omit<Snippet, "id" | "created_at">) {
    return getDb()
      .prepare(
        `INSERT INTO snippets (title, language, code, explanation, source_url)
         VALUES (@title, @language, @code, @explanation, @source_url)`,
      )
      .run(s);
  },

  getSnippets(limit = 20): Snippet[] {
    return getDb()
      .prepare("SELECT * FROM snippets ORDER BY created_at DESC LIMIT ?")
      .all(limit) as Snippet[];
  },

  getState(key: string): string | null {
    const row = getDb()
      .prepare("SELECT value FROM agent_state WHERE key = ?")
      .get(key) as AgentState | undefined;
    return row?.value ?? null;
  },

  setState(key: string, value: string) {
    getDb()
      .prepare(
        `INSERT INTO agent_state (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      )
      .run(key, value);
  },

  savePublished(slug: string, title: string, url: string) {
    return getDb()
      .prepare(
        "INSERT OR IGNORE INTO published_articles (slug, title, url) VALUES (?, ?, ?)",
      )
      .run(slug, title, url);
  },
};
