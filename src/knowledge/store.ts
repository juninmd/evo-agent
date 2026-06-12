import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";
import type { OperationalStats } from "../observability/health.js";

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

export interface SourceHealth {
  source: string;
  consecutive_failures: number;
  skip_remaining: number;
  updated_at: string;
}

export interface PublishedArticle {
  id: number;
  slug: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  kind: "article" | "report";
  period: string | null;
  notification_status: "pending" | "delivered" | "dead_letter";
  notification_attempts: number;
  next_notification_at: string;
  notification_error: string | null;
  editorial_metrics: Record<string, unknown>;
  published_at: string;
}

export interface PromptVersion {
  id: number;
  prompt: string;
  score: number;
  status: "promoted" | "rejected" | "rolled_back";
  reason: string;
  created_at: string;
}

export interface PublishedEvidence {
  article_url: string;
  source_url: string;
  source_title: string;
  excerpt: string;
  observed_at: string;
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

export function migrate(db: Database.Database) {
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
      date TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      kind TEXT NOT NULL DEFAULT 'article',
      period TEXT,
      notification_status TEXT NOT NULL DEFAULT 'pending',
      notification_attempts INTEGER NOT NULL DEFAULT 0,
      next_notification_at TEXT NOT NULL DEFAULT (datetime('now')),
      notification_error TEXT,
      editorial_metrics TEXT NOT NULL DEFAULT '{}',
      published_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cycle_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      metrics_json TEXT NOT NULL DEFAULT '{}',
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS source_health (
      source TEXT PRIMARY KEY,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      skip_remaining INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt TEXT NOT NULL,
      score INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metric_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      labels_json TEXT NOT NULL DEFAULT '{}',
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS published_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_url TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      observed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(article_url, source_url)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_crawled_at
      ON articles(crawled_at);
    CREATE INDEX IF NOT EXISTS idx_metric_events_recorded_at
      ON metric_events(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_published_evidence_article
      ON published_evidence(article_url);
  `);

  // Databases created before engagement_score existed need the column added;
  // CREATE TABLE IF NOT EXISTS is a no-op for them.
  const articleColumns = db
    .prepare("PRAGMA table_info(articles)")
    .all() as Array<{ name: string }>;
  if (!articleColumns.some((c) => c.name === "engagement_score")) {
    db.exec(
      "ALTER TABLE articles ADD COLUMN engagement_score INTEGER DEFAULT 0",
    );
  }

  const publishedColumns = db
    .prepare("PRAGMA table_info(published_articles)")
    .all() as Array<{ name: string }>;
  const additions: Array<[string, string]> = [
    ["date", "TEXT NOT NULL DEFAULT ''"],
    ["summary", "TEXT NOT NULL DEFAULT ''"],
    ["tags", "TEXT NOT NULL DEFAULT '[]'"],
    ["kind", "TEXT NOT NULL DEFAULT 'article'"],
    ["period", "TEXT"],
    ["notification_status", "TEXT NOT NULL DEFAULT 'pending'"],
    ["notification_attempts", "INTEGER NOT NULL DEFAULT 0"],
    ["next_notification_at", "TEXT"],
    ["notification_error", "TEXT"],
    ["editorial_metrics", "TEXT NOT NULL DEFAULT '{}'"],
  ];
  for (const [name, definition] of additions) {
    if (!publishedColumns.some((column) => column.name === name)) {
      db.exec(
        `ALTER TABLE published_articles ADD COLUMN ${name} ${definition}`,
      );
    }
  }

  db.exec(`
    UPDATE published_articles
    SET date = COALESCE(NULLIF(date, ''), substr(published_at, 1, 10)),
        kind = CASE WHEN url LIKE '%/reports/%' THEN 'report' ELSE kind END,
        next_notification_at = COALESCE(next_notification_at, published_at, datetime('now'))
    WHERE date = '' OR kind = 'article' OR next_notification_at IS NULL;

    UPDATE published_articles
    SET notification_status = 'delivered',
        notification_error = 'legacy record migrated without notification state'
    WHERE notification_status = 'pending'
      AND notification_attempts = 0
      AND summary = ''
      AND editorial_metrics = '{}';
  `);

  db.exec(`
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

export interface SavePublishedInput {
  slug: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  kind: "article" | "report";
  period?: string;
  editorialMetrics?: object;
  evidence?: Array<{
    sourceUrl: string;
    sourceTitle: string;
    excerpt: string;
  }>;
}

let _urlExistsStmt: ReturnType<Database.Database["prepare"]> | null = null;

function urlExistsStmt() {
  if (!_urlExistsStmt) {
    _urlExistsStmt = getDb().prepare("SELECT 1 FROM articles WHERE url = ?");
  }
  return _urlExistsStmt;
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
    return !!urlExistsStmt().get(url);
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

  savePromptVersion(input: {
    prompt: string;
    score: number;
    status: PromptVersion["status"];
    reason: string;
  }): number {
    const result = getDb()
      .prepare(
        `INSERT INTO prompt_versions (prompt, score, status, reason)
         VALUES (@prompt, @score, @status, @reason)`,
      )
      .run(input);
    return Number(result.lastInsertRowid);
  },

  getPreviousPromotedPrompt(): Pick<
    PromptVersion,
    "id" | "prompt" | "score"
  > | null {
    const current = this.getState("system_prompt");
    return (
      (getDb()
        .prepare(
          `SELECT id, prompt, score
           FROM prompt_versions
           WHERE status = 'promoted' AND prompt <> ?
           ORDER BY id DESC
           LIMIT 1`,
        )
        .get(current ?? "") as
        | Pick<PromptVersion, "id" | "prompt" | "score">
        | undefined) ?? null
    );
  },

  vacuum() {
    getDb().exec("VACUUM");
  },

  recordMetric(
    name: string,
    value: number,
    labels: Record<string, string | number | boolean> = {},
  ) {
    getDb()
      .prepare(
        `INSERT INTO metric_events (name, value, labels_json)
         VALUES (?, ?, ?)`,
      )
      .run(name, value, JSON.stringify(labels));
  },

  getOperationalStats(): OperationalStats {
    const row = getDb()
      .prepare(
        `SELECT
          (SELECT count(*) FROM published_articles
           WHERE notification_status = 'pending') AS pendingNotifications,
          (SELECT count(*) FROM published_articles
           WHERE notification_status = 'dead_letter') AS deadLetterNotifications,
          (SELECT count(*) FROM cycle_runs
           WHERE status = 'failed'
             AND started_at >= datetime('now', '-24 hours')
             AND started_at > COALESCE(
               (SELECT max(started_at) FROM cycle_runs WHERE status = 'succeeded'),
               '1970-01-01'
             ))
            AS failedCycles24h,
          (SELECT count(*) FROM cycle_runs
           WHERE status = 'succeeded' AND started_at >= datetime('now', '-24 hours'))
            AS successfulCycles24h,
          (SELECT count(*) FROM articles
           WHERE crawled_at >= datetime('now', '-48 hours')) AS recentArticles,
          (SELECT count(*) FROM articles
           WHERE crawled_at >= datetime('now', '-48 hours')
             AND (
               lower(source) LIKE '%anthropic%'
               OR lower(source) LIKE '%openai%'
               OR lower(source) LIKE '%github blog%'
               OR lower(source) LIKE '%google research%'
               OR lower(source) LIKE '%hugging face%'
               OR lower(source) LIKE '%mistral%'
             )) AS recentPrimarySources`,
      )
      .get() as OperationalStats;
    return row;
  },

  startCycle(type: string): number {
    const result = getDb()
      .prepare("INSERT INTO cycle_runs (type) VALUES (?)")
      .run(type);
    return Number(result.lastInsertRowid);
  },

  finishCycle(
    id: number,
    status: "succeeded" | "failed" | "skipped",
    metrics: Record<string, unknown>,
    error?: string,
  ) {
    getDb()
      .prepare(
        `UPDATE cycle_runs
         SET status = ?, metrics_json = ?, error = ?, finished_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, JSON.stringify(metrics), error ?? null, id);
  },

  getSourceHealth(source: string): SourceHealth | null {
    return (
      (getDb()
        .prepare("SELECT * FROM source_health WHERE source = ?")
        .get(source) as SourceHealth | undefined) ?? null
    );
  },

  setSourceHealth(
    source: string,
    consecutiveFailures: number,
    skipRemaining: number,
  ) {
    getDb()
      .prepare(
        `INSERT INTO source_health
           (source, consecutive_failures, skip_remaining)
         VALUES (?, ?, ?)
         ON CONFLICT(source) DO UPDATE SET
           consecutive_failures = excluded.consecutive_failures,
           skip_remaining = excluded.skip_remaining,
           updated_at = datetime('now')`,
      )
      .run(source, consecutiveFailures, skipRemaining);
  },

  savePublished(item: SavePublishedInput) {
    const database = getDb();
    const save = database.transaction(() => {
      const result = database
        .prepare(
          `INSERT INTO published_articles
           (slug, title, url, date, summary, tags, kind, period,
            notification_status, notification_attempts, next_notification_at,
            notification_error, editorial_metrics)
         VALUES (@slug, @title, @url, @date, @summary, @tags, @kind, @period,
                 'pending', 0, datetime('now'), NULL, @editorialMetrics)
         ON CONFLICT(slug) DO UPDATE SET
           title = excluded.title,
           url = excluded.url,
           date = excluded.date,
           summary = excluded.summary,
           tags = excluded.tags,
           kind = excluded.kind,
           period = excluded.period,
           notification_status = 'pending',
           notification_attempts = 0,
           next_notification_at = datetime('now'),
           notification_error = NULL,
           editorial_metrics = excluded.editorial_metrics,
           published_at = datetime('now')`,
        )
        .run({
          ...item,
          tags: JSON.stringify(item.tags),
          period: item.period ?? null,
          editorialMetrics: JSON.stringify(item.editorialMetrics ?? {}),
        });
      database
        .prepare("DELETE FROM published_evidence WHERE article_url = ?")
        .run(item.url);
      const insertEvidence = database.prepare(
        `INSERT INTO published_evidence
           (article_url, source_url, source_title, excerpt)
         VALUES (?, ?, ?, ?)`,
      );
      for (const evidence of item.evidence ?? []) {
        insertEvidence.run(
          item.url,
          evidence.sourceUrl,
          evidence.sourceTitle,
          evidence.excerpt,
        );
      }
      return result;
    });
    return save();
  },

  markNotification(
    url: string,
    status: "pending" | "delivered" | "dead_letter",
  ) {
    getDb()
      .prepare(
        "UPDATE published_articles SET notification_status = ? WHERE url = ?",
      )
      .run(status, url);
  },

  getPendingNotifications(now = new Date().toISOString(), limit = 20) {
    return getDb()
      .prepare(
        `SELECT url, title, summary, kind, notification_attempts
         FROM published_articles
         WHERE notification_status = 'pending'
           AND datetime(next_notification_at) <= datetime(?)
         ORDER BY next_notification_at, id
         LIMIT ?`,
      )
      .all(now, limit) as Array<
      Pick<
        PublishedArticle,
        "url" | "title" | "summary" | "kind" | "notification_attempts"
      >
    >;
  },

  markNotificationDelivered(url: string) {
    getDb()
      .prepare(
        `UPDATE published_articles
         SET notification_status = 'delivered',
             notification_attempts = notification_attempts + 1,
             notification_error = NULL
         WHERE url = ?`,
      )
      .run(url);
  },

  markNotificationFailed(
    url: string,
    error: string,
    nextAttemptAt: string,
    deadLetter: boolean,
  ) {
    getDb()
      .prepare(
        `UPDATE published_articles
         SET notification_status = ?,
             notification_attempts = notification_attempts + 1,
             next_notification_at = ?,
             notification_error = ?
         WHERE url = ?`,
      )
      .run(deadLetter ? "dead_letter" : "pending", nextAttemptAt, error, url);
  },

  getPublished(): PublishedArticle[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM published_articles
         ORDER BY date DESC, published_at DESC`,
      )
      .all() as Array<
      Omit<PublishedArticle, "tags" | "editorial_metrics"> & {
        tags: string;
        editorial_metrics: string;
      }
    >;
    return rows.map((row) => ({
      ...row,
      tags: safeJsonArray(row.tags),
      editorial_metrics: safeJsonObject(row.editorial_metrics),
    }));
  },

  getPublishedEvidence(articleUrl: string): PublishedEvidence[] {
    return getDb()
      .prepare(
        `SELECT article_url, source_url, source_title, excerpt, observed_at
         FROM published_evidence
         WHERE article_url = ?
         ORDER BY id`,
      )
      .all(articleUrl) as PublishedEvidence[];
  },
};

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function safeJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}
