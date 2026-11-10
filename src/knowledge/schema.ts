import type Database from "better-sqlite3";
import { canonicalUrl } from "../utils/url.js";

// One transaction: a failed step leaves the schema untouched, and a file
// database pays one sync instead of one per statement.
export function migrate(db: Database.Database) {
  db.transaction(() => applyMigrations(db))();
}

function applyMigrations(db: Database.Database) {
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
      status TEXT NOT NULL DEFAULT 'published',
      quality_score INTEGER,
      revision INTEGER NOT NULL DEFAULT 1,
      published_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS edition_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      edition_url TEXT NOT NULL,
      revision INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT 'initial',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(edition_url, revision)
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

    -- Keyed by model too: vectors from different models are not comparable.
    CREATE TABLE IF NOT EXISTS article_embeddings (
      url TEXT NOT NULL,
      model TEXT NOT NULL,
      vector BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (url, model)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_crawled_at
      ON articles(crawled_at);
    CREATE INDEX IF NOT EXISTS idx_metric_events_recorded_at
      ON metric_events(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_published_evidence_article
      ON published_evidence(article_url);

    CREATE TABLE IF NOT EXISTS intelligence_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT NOT NULL DEFAULT (datetime('now')),
      day TEXT NOT NULL,
      source_url TEXT NOT NULL,
      models_json TEXT NOT NULL,
      top_model TEXT NOT NULL,
      top_score REAL NOT NULL,
      changes_json TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_intelligence_snapshots_day
      ON intelligence_snapshots(day);
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

  // Dedup key, separate from url: url is the link readers click and must not
  // be rewritten (dropping "www." breaks hosts that only resolve with it).
  if (!articleColumns.some((c) => c.name === "url_key")) {
    db.exec("ALTER TABLE articles ADD COLUMN url_key TEXT");
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_articles_url_key ON articles(url_key)",
  );
  const unkeyed = db
    .prepare("SELECT id, url FROM articles WHERE url_key IS NULL")
    .all() as Array<{ id: number; url: string }>;
  const setKey = db.prepare("UPDATE articles SET url_key = ? WHERE id = ?");
  for (const row of unkeyed) setKey.run(canonicalUrl(row.url), row.id);

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
    ["status", "TEXT NOT NULL DEFAULT 'published'"],
    ["quality_score", "INTEGER"],
    ["revision", "INTEGER NOT NULL DEFAULT 1"],
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

  qualifyLegacySlugs(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_articles_engagement
      ON articles(engagement_score DESC);
    CREATE INDEX IF NOT EXISTS idx_published_articles_date
      ON published_articles(kind, date);
  `);

  // Read paths the console polls. None of these tables is pruned, so every
  // query below was a full scan plus a sort that grew with the agent's age;
  // docs/BENCHMARK.md has the before/after on a year of rows.
  db.exec(`
    -- Ciclos, newest first, and the walk a type filter does over it.
    CREATE INDEX IF NOT EXISTS idx_cycle_runs_started_at
      ON cycle_runs(started_at DESC, id DESC);
    -- The three cycle counters of getOperationalStats and the status filter.
    CREATE INDEX IF NOT EXISTS idx_cycle_runs_status_started
      ON cycle_runs(status, started_at);
    -- Outbox and lifecycle updates address an edition by its URL.
    CREATE INDEX IF NOT EXISTS idx_published_articles_url
      ON published_articles(url);
    -- getPublishedRecent (overview) and the editions listing order.
    CREATE INDEX IF NOT EXISTS idx_published_articles_published_at
      ON published_articles(published_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_published_articles_listing
      ON published_articles(date DESC, published_at DESC, id DESC);
    -- One metric's series: name first, then the window.
    CREATE INDEX IF NOT EXISTS idx_metric_events_name_recorded
      ON metric_events(name, recorded_at DESC, id DESC);
  `);
}

/**
 * A slug taken from the title alone repeats across days, and the UNIQUE(slug)
 * upsert then replaced the older edition's row. Rows written before the date
 * joined the slug get it now; a slug that already carries its date (reports,
 * retroactive editions) is left alone, and a clash keeps the old slug.
 */
function qualifyLegacySlugs(db: Database.Database) {
  const rows = db
    .prepare("SELECT id, slug, date FROM published_articles WHERE date <> ''")
    .all() as Array<{ id: number; slug: string; date: string }>;
  const taken = new Set(rows.map((row) => row.slug));
  const rename = db.prepare(
    "UPDATE published_articles SET slug = ? WHERE id = ?",
  );
  for (const row of rows) {
    const next = qualifiedSlug(row.slug, row.date);
    if (next === row.slug || taken.has(next)) continue;
    rename.run(next, row.id);
    taken.add(next);
  }
}

/** Date-qualified identity: the same title on two days is two editions. */
export function qualifiedSlug(slug: string, date: string): string {
  return slug.includes(date) ? slug : `${date}-${slug}`;
}
