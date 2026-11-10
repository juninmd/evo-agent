import { createHash } from "node:crypto";
import type { OperationalStats } from "../observability/health.js";
import {
  parseJsonArray,
  parseJsonObject,
  parseJsonStringArray,
} from "../utils/json.js";
import { canonicalUrl, stripTracking } from "../utils/url.js";
import { getDb, sqliteTs, stmt } from "./database.js";
import type {
  AgentState,
  Article,
  CycleRun,
  IntelligenceModelRecord,
  IntelligenceSnapshot,
  IntelligenceSnapshotRow,
  MetricEvent,
  MetricSummary,
  PromptVersion,
  PublishedArticle,
  PublishedEvidence,
  SaveArticleInput,
  SaveIntelligenceSnapshotInput,
  SavePublishedInput,
  Snippet,
  SourceHealth,
  SourceTotal,
} from "./types.js";

// The store is the facade the rest of the agent imports: the connection, the
// schema and the row types live in their own modules and are re-exported here.
export { getDb } from "./database.js";
export { migrate, qualifiedSlug } from "./schema.js";
export type * from "./types.js";

const PRIMARY_SOURCE_SQL = `
  lower(source) LIKE '%anthropic%'
  OR lower(source) LIKE '%openai%'
  OR lower(source) LIKE '%github blog%'
  OR lower(source) LIKE '%google research%'
  OR lower(source) LIKE '%google ai%'
  OR lower(source) LIKE '%hugging face%'
  OR lower(source) LIKE '%mistral%'
  OR lower(source) LIKE '%together ai%'
  OR lower(source) LIKE '%vscode updates%'
`;

/** Stack and leadership feeds belong to the techlead digest, never to the AI editions. */
export const TECHLEAD_SOURCE_PREFIX = "Techlead: ";
const NOT_TECHLEAD_SQL = `source NOT LIKE '${TECHLEAD_SOURCE_PREFIX}%'`;
// LiteLLM is already crawled as an AI source and is part of the stack too.
const TECHLEAD_SQL = `(source LIKE '${TECHLEAD_SOURCE_PREFIX}%' OR source = 'LiteLLM Releases')`;

type PublishedRow = Omit<PublishedArticle, "tags" | "editorial_metrics"> & {
  tags: string;
  editorial_metrics: string;
};

/**
 * Appends a revision when the committed Markdown changed. The first revision
 * of a row that predates revisions is a baseline, not a correction.
 */
function recordRevision(
  url: string,
  content: string,
  reason: string,
  rowExisted: boolean,
) {
  const hash = createHash("sha256").update(content).digest("hex");
  const last = stmt(
    `SELECT revision, content_hash FROM edition_revisions
     WHERE edition_url = ? ORDER BY revision DESC LIMIT 1`,
  ).get(url) as { revision: number; content_hash: string } | undefined;
  if (last?.content_hash === hash) return;
  const revision = (last?.revision ?? 0) + 1;
  stmt(
    `INSERT INTO edition_revisions
       (edition_url, revision, content, content_hash, reason)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    url,
    revision,
    content,
    hash,
    last || !rowExisted ? reason : "baseline",
  );
  const corrected = last !== undefined;
  stmt(
    `UPDATE published_articles
     SET revision = ?,
         status = CASE WHEN status = 'retracted' OR ? = 0 THEN status
                       ELSE 'corrected' END
     WHERE url = ?`,
  ).run(revision, corrected ? 1 : 0, url);
}

function hydratePublished(row: PublishedRow): PublishedArticle {
  return {
    ...row,
    tags: parseJsonStringArray(row.tags),
    editorial_metrics: parseJsonObject(row.editorial_metrics),
  };
}

export const db = {
  saveArticle(a: SaveArticleInput) {
    // Upsert: a URL re-seen (re-trending repo, refreshed comments) updates its
    // engagement instead of being silently ignored; crawl time stays the first
    // sighting so recency semantics are preserved.
    return stmt(
      `INSERT INTO articles (title, source, url, url_key, summary, tags, engagement_score)
       VALUES (@title, @source, @url, @url_key, @summary, @tags, @engagement_score)
       ON CONFLICT(url) DO UPDATE SET
         summary = excluded.summary,
         tags = excluded.tags,
         engagement_score = excluded.engagement_score`,
    ).run({
      title: a.title,
      source: a.source,
      url: stripTracking(a.url),
      url_key: canonicalUrl(a.url),
      summary: a.summary,
      tags: a.tags,
      engagement_score: a.engagement_score ?? 0,
    });
  },

  getRecentArticles(limit = 50): Article[] {
    return stmt("SELECT * FROM articles ORDER BY crawled_at DESC LIMIT ?").all(
      limit,
    ) as Article[];
  },

  getArticlesSince(
    days: number,
    limit = 2000,
    filters: { source?: string } = {},
  ): Article[] {
    // Filters live in the WHERE clause: applying them after the LIMIT returned
    // fewer rows than matched whenever the window held more than `limit`.
    const where = [`crawled_at >= datetime('now', ?)`, NOT_TECHLEAD_SQL];
    const params: Array<string | number> = [`-${days} days`];
    if (filters.source) {
      where.push("source = ?");
      params.push(filters.source);
    }
    return stmt(
      `SELECT * FROM articles
       WHERE ${where.join(" AND ")}
       ORDER BY crawled_at DESC
       LIMIT ?`,
    ).all(...params, limit) as Article[];
  },

  getTechleadArticlesSince(days: number, limit = 300): Article[] {
    return stmt(
      `SELECT * FROM articles
       WHERE crawled_at >= datetime('now', ?)
         AND ${TECHLEAD_SQL}
       ORDER BY crawled_at DESC
       LIMIT ?`,
    ).all(`-${days} days`, limit) as Article[];
  },

  // Column is bare on the left so idx_articles_crawled_at is used; the params
  // are normalized to SQLite format instead of wrapping the column in
  // datetime(), which would force a full scan.
  getArticlesBetween(from: string, to: string, limit = 2000): Article[] {
    return stmt(
      `SELECT * FROM articles
       WHERE crawled_at >= ? AND crawled_at < ?
         AND ${NOT_TECHLEAD_SQL}
       ORDER BY crawled_at DESC
       LIMIT ?`,
    ).all(sqliteTs(from), sqliteTs(to), limit) as Article[];
  },

  getPrimaryArticlesSince(days: number, limit = 200): Article[] {
    return stmt(
      `SELECT * FROM articles
       WHERE crawled_at >= datetime('now', ?)
         AND (${PRIMARY_SOURCE_SQL})
       ORDER BY crawled_at DESC
       LIMIT ?`,
    ).all(`-${days} days`, limit) as Article[];
  },

  getPrimaryArticlesBetween(from: string, to: string, limit = 50): Article[] {
    return stmt(
      `SELECT * FROM articles
       WHERE crawled_at >= ? AND crawled_at < ?
         AND (${PRIMARY_SOURCE_SQL})
       ORDER BY crawled_at DESC
       LIMIT ?`,
    ).all(sqliteTs(from), sqliteTs(to), limit) as Article[];
  },

  urlExists(url: string): boolean {
    // Raw too: rows stored before url_key existed match by their URL.
    return !!stmt("SELECT 1 FROM articles WHERE url = ? OR url_key = ?").get(
      url,
      canonicalUrl(url),
    );
  },

  saveSnippet(s: Omit<Snippet, "id" | "created_at">) {
    return stmt(
      `INSERT INTO snippets (title, language, code, explanation, source_url)
       VALUES (@title, @language, @code, @explanation, @source_url)`,
    ).run(s);
  },

  getSnippets(limit = 20): Snippet[] {
    return stmt("SELECT * FROM snippets ORDER BY created_at DESC LIMIT ?").all(
      limit,
    ) as Snippet[];
  },

  /** Keeps the snippet store bounded; the improvement cycle grows it by one per run. */
  pruneSnippets(keep = 50) {
    stmt(
      `DELETE FROM snippets WHERE id NOT IN (
         SELECT id FROM snippets ORDER BY created_at DESC, id DESC LIMIT ?
       )`,
    ).run(keep);
  },

  getState(key: string): string | null {
    const row = stmt("SELECT value FROM agent_state WHERE key = ?").get(key) as
      | AgentState
      | undefined;
    return row?.value ?? null;
  },

  setState(key: string, value: string) {
    stmt(
      `INSERT INTO agent_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ).run(key, value);
  },

  savePromptVersion(input: {
    prompt: string;
    score: number;
    status: PromptVersion["status"];
    reason: string;
  }): number {
    const result = stmt(
      `INSERT INTO prompt_versions (prompt, score, status, reason)
       VALUES (@prompt, @score, @status, @reason)`,
    ).run(input);
    return Number(result.lastInsertRowid);
  },

  getPreviousPromotedPrompt(): Pick<
    PromptVersion,
    "id" | "prompt" | "score"
  > | null {
    const current = this.getState("system_prompt");
    return (
      (stmt(
        `SELECT id, prompt, score
         FROM prompt_versions
         WHERE status = 'promoted' AND prompt <> ?
         ORDER BY id DESC
         LIMIT 1`,
      ).get(current ?? "") as
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
    stmt(
      `INSERT INTO metric_events (name, value, labels_json)
       VALUES (?, ?, ?)`,
    ).run(name, value, JSON.stringify(labels));
  },

  getOperationalStats(): OperationalStats {
    const row = stmt(
      `SELECT
          (SELECT count(*) FROM published_articles
           WHERE notification_status = 'pending') AS pendingNotifications,
          (SELECT count(*) FROM published_articles
           WHERE notification_status = 'pending'
             AND datetime(published_at) < datetime('now', '-2 hours'))
            AS stalePendingNotifications,
          (SELECT count(*) FROM published_articles
           WHERE notification_status = 'dead_letter') AS deadLetterNotifications,
          -- Per type: an hourly crawl success must not hide a failed radar.
          (SELECT count(*) FROM cycle_runs failed
           WHERE failed.status = 'failed'
             AND failed.started_at >= datetime('now', '-24 hours')
             AND NOT EXISTS (
               SELECT 1 FROM cycle_runs later
               WHERE later.type = failed.type
                 AND later.status = 'succeeded'
                 AND later.started_at > failed.started_at
             ))
            AS failedCycles24h,
          (SELECT count(*) FROM cycle_runs
           WHERE status = 'running'
             AND started_at < datetime('now', '-6 hours'))
            AS staleRunningCycles,
          (SELECT count(*) FROM cycle_runs
           WHERE status = 'succeeded' AND started_at >= datetime('now', '-24 hours'))
            AS successfulCycles24h,
          (SELECT count(*) FROM articles
           WHERE crawled_at >= datetime('now', '-48 hours')) AS recentArticles,
          (SELECT count(*) FROM articles
           WHERE crawled_at >= datetime('now', '-48 hours')
             AND (${PRIMARY_SOURCE_SQL})) AS recentPrimarySources`,
    ).get() as OperationalStats;
    return row;
  },

  startCycle(type: string): number {
    const result = stmt("INSERT INTO cycle_runs (type) VALUES (?)").run(type);
    return Number(result.lastInsertRowid);
  },

  finishCycle(
    id: number,
    status: "succeeded" | "failed" | "skipped",
    metrics: Record<string, unknown>,
    error?: string,
  ) {
    stmt(
      `UPDATE cycle_runs
       SET status = ?, metrics_json = ?, error = ?, finished_at = datetime('now')
       WHERE id = ?`,
    ).run(status, JSON.stringify(metrics), error ?? null, id);
  },

  failStaleRunningCycles(maxAgeHours = 6): number {
    const result = stmt(
      `UPDATE cycle_runs
       SET status = 'failed',
           error = 'cycle abandoned by previous process',
           finished_at = datetime('now')
       WHERE status = 'running'
         AND started_at < datetime('now', ?)`,
    ).run(`-${maxAgeHours} hours`);
    return result.changes;
  },

  getSourceHealth(source: string): SourceHealth | null {
    return (
      (stmt("SELECT * FROM source_health WHERE source = ?").get(source) as
        | SourceHealth
        | undefined) ?? null
    );
  },

  setSourceHealth(
    source: string,
    consecutiveFailures: number,
    skipRemaining: number,
  ) {
    stmt(
      `INSERT INTO source_health
         (source, consecutive_failures, skip_remaining)
       VALUES (?, ?, ?)
       ON CONFLICT(source) DO UPDATE SET
         consecutive_failures = excluded.consecutive_failures,
         skip_remaining = excluded.skip_remaining,
         updated_at = datetime('now')`,
    ).run(source, consecutiveFailures, skipRemaining);
  },

  savePublished(item: SavePublishedInput) {
    const database = getDb();
    const save = database.transaction(() => {
      const existing = stmt(
        "SELECT id FROM published_articles WHERE slug = ?",
      ).get(item.slug) as { id: number } | undefined;
      // Republishing is a correction, not news: the notification state of an
      // existing row survives unless the caller states one explicitly.
      const result = stmt(
        `INSERT INTO published_articles
         (slug, title, url, date, summary, tags, kind, period,
          notification_status, notification_attempts, next_notification_at,
          notification_error, editorial_metrics, quality_score)
         VALUES (@slug, @title, @url, @date, @summary, @tags, @kind, @period,
                 COALESCE(@notificationStatus, 'pending'), 0, datetime('now'),
                 NULL, @editorialMetrics, @qualityScore)
         ON CONFLICT(slug) DO UPDATE SET
           title = excluded.title,
           url = excluded.url,
           date = excluded.date,
           summary = excluded.summary,
           tags = excluded.tags,
           kind = excluded.kind,
           period = excluded.period,
           notification_status = CASE WHEN @notificationStatus IS NULL
             THEN published_articles.notification_status
             ELSE excluded.notification_status END,
           notification_attempts = CASE WHEN @notificationStatus IS NULL
             THEN published_articles.notification_attempts ELSE 0 END,
           next_notification_at = CASE WHEN @notificationStatus IS NULL
             THEN published_articles.next_notification_at
             ELSE datetime('now') END,
           notification_error = CASE WHEN @notificationStatus IS NULL
             THEN published_articles.notification_error ELSE NULL END,
           editorial_metrics = excluded.editorial_metrics,
           quality_score = excluded.quality_score`,
      ).run({
        slug: item.slug,
        title: item.title,
        url: item.url,
        date: item.date,
        summary: item.summary,
        kind: item.kind,
        tags: JSON.stringify(item.tags),
        period: item.period ?? null,
        notificationStatus: item.notificationStatus ?? null,
        editorialMetrics: JSON.stringify(item.editorialMetrics ?? {}),
        qualityScore: item.qualityScore ?? null,
      });
      stmt("DELETE FROM published_evidence WHERE article_url = ?").run(
        item.url,
      );
      const insertEvidence = stmt(
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
      if (item.content !== undefined) {
        recordRevision(
          item.url,
          item.content,
          item.revisionReason ?? (existing ? "update" : "initial"),
          Boolean(existing),
        );
      }
      return result;
    });
    return save();
  },

  /**
   * Removes a publication the git commit failed to land, so the next cycle can
   * re-publish it without leaving a dangling pending notification.
   */
  deletePublishedByUrl(url: string) {
    stmt("DELETE FROM published_articles WHERE url = ?").run(url);
    stmt("DELETE FROM published_evidence WHERE article_url = ?").run(url);
    stmt("DELETE FROM edition_revisions WHERE edition_url = ?").run(url);
  },

  markNotification(
    url: string,
    status: "pending" | "delivered" | "dead_letter",
  ) {
    stmt(
      "UPDATE published_articles SET notification_status = ? WHERE url = ?",
    ).run(status, url);
  },

  getPendingNotifications(now = new Date().toISOString(), limit = 20) {
    return stmt(
      `SELECT url, title, summary, kind, notification_attempts
       FROM published_articles
       WHERE notification_status = 'pending'
         AND datetime(next_notification_at) <= datetime(?)
       ORDER BY next_notification_at, id
       LIMIT ?`,
    ).all(now, limit) as Array<
      Pick<
        PublishedArticle,
        "url" | "title" | "summary" | "kind" | "notification_attempts"
      >
    >;
  },

  markNotificationDelivered(url: string) {
    stmt(
      `UPDATE published_articles
       SET notification_status = 'delivered',
           notification_attempts = notification_attempts + 1,
           notification_error = NULL
       WHERE url = ?`,
    ).run(url);
  },

  markNotificationFailed(
    url: string,
    error: string,
    nextAttemptAt: string,
    deadLetter: boolean,
  ) {
    stmt(
      `UPDATE published_articles
       SET notification_status = ?,
           notification_attempts = notification_attempts + 1,
           next_notification_at = ?,
           notification_error = ?
       WHERE url = ?`,
    ).run(deadLetter ? "dead_letter" : "pending", nextAttemptAt, error, url);
  },

  /** A ping for an edition that is days old is noise, not news: drop it. */
  suppressStaleNotifications(maxAgeHours: number): number {
    return stmt(
      `UPDATE published_articles
       SET notification_status = 'suppressed',
           notification_error = COALESCE(notification_error || ' | ', '') ||
             'not delivered within ' || ? || 'h'
       WHERE notification_status = 'pending'
         AND datetime(published_at) < datetime('now', ?)`,
    ).run(maxAgeHours, `-${maxAgeHours} hours`).changes;
  },

  /**
   * Counting a day used to mean loading and JSON-parsing every row ever
   * published; the daily-edition loop does it twice per iteration.
   */
  countPublishedOn(kind: string, date: string): number {
    const row = stmt(
      `SELECT count(*) AS total FROM published_articles
       WHERE kind = ? AND date = ?`,
    ).get(kind, date) as { total: number };
    return row.total;
  },

  getPublishedOn(kind: string, date: string): PublishedArticle[] {
    const rows = stmt(
      `SELECT * FROM published_articles
       WHERE kind = ? AND date = ?
       ORDER BY published_at DESC`,
    ).all(kind, date) as PublishedRow[];
    return rows.map(hydratePublished);
  },

  getPublished(): PublishedArticle[] {
    const rows = stmt(
      `SELECT * FROM published_articles
       ORDER BY date DESC, published_at DESC`,
    ).all() as PublishedRow[];
    return rows.map(hydratePublished);
  },

  getPublishedEvidence(articleUrl: string): PublishedEvidence[] {
    return stmt(
      `SELECT article_url, source_url, source_title, excerpt, observed_at
       FROM published_evidence
       WHERE article_url = ?
       ORDER BY id`,
    ).all(articleUrl) as PublishedEvidence[];
  },

  saveIntelligenceSnapshot(input: SaveIntelligenceSnapshotInput): number {
    const top = input.models[0];
    const result = stmt(
      `INSERT INTO intelligence_snapshots
       (day, source_url, models_json, top_model, top_score, changes_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      input.day,
      input.source_url ?? "https://artificialanalysis.ai/models#intelligence",
      JSON.stringify(input.models),
      top?.name ?? "",
      top?.intelligenceIndex ?? 0,
      JSON.stringify(input.changes ?? {}),
    );
    return Number(result.lastInsertRowid);
  },

  getLatestIntelligenceSnapshot(): IntelligenceSnapshot | null {
    const row = stmt(
      `SELECT * FROM intelligence_snapshots
       ORDER BY id DESC LIMIT 1`,
    ).get() as IntelligenceSnapshotRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      captured_at: row.captured_at,
      day: row.day,
      source_url: row.source_url,
      models: parseJsonArray<IntelligenceModelRecord>(row.models_json),
      top_model: row.top_model,
      top_score: row.top_score,
      changes: parseJsonObject(row.changes_json),
    };
  },

  getIntelligenceSnapshots(limit = 2): IntelligenceSnapshot[] {
    const rows = stmt(
      `SELECT * FROM intelligence_snapshots
       ORDER BY id DESC LIMIT ?`,
    ).all(limit) as IntelligenceSnapshotRow[];
    return rows.map((row) => ({
      id: row.id,
      captured_at: row.captured_at,
      day: row.day,
      source_url: row.source_url,
      models: parseJsonArray<IntelligenceModelRecord>(row.models_json),
      top_model: row.top_model,
      top_score: row.top_score,
      changes: parseJsonObject(row.changes_json),
    }));
  },

  /** Bounded instead of `getPublished()`: the console never loads months of editions. */
  getPublishedRecent(
    limit = 50,
    kind?: "article" | "report",
    notificationStatus?: PublishedArticle["notification_status"],
  ): PublishedArticle[] {
    const where: string[] = [];
    const params: Array<string | number> = [];
    if (kind) {
      where.push("kind = ?");
      params.push(kind);
    }
    if (notificationStatus) {
      where.push("notification_status = ?");
      params.push(notificationStatus);
    }
    const rows = stmt(
      `SELECT * FROM published_articles
       ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY published_at DESC, id DESC
       LIMIT ?`,
    ).all(...params, limit) as PublishedRow[];
    return rows.map(hydratePublished);
  },

  getPublishedBySlug(slug: string): PublishedArticle | null {
    const row = stmt("SELECT * FROM published_articles WHERE slug = ?").get(
      slug,
    ) as PublishedRow | undefined;
    return row ? hydratePublished(row) : null;
  },

  getCycleRuns(
    limit = 50,
    filters: { type?: string; status?: string } = {},
  ): CycleRun[] {
    const where: string[] = [];
    const params: Array<string | number> = [];
    if (filters.type) {
      where.push("type = ?");
      params.push(filters.type);
    }
    if (filters.status) {
      where.push("status = ?");
      params.push(filters.status);
    }
    return stmt(
      `SELECT * FROM cycle_runs
       ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY started_at DESC, id DESC
       LIMIT ?`,
    ).all(...params, limit) as CycleRun[];
  },

  getPromptVersions(limit = 50): PromptVersion[] {
    return stmt("SELECT * FROM prompt_versions ORDER BY id DESC LIMIT ?").all(
      limit,
    ) as PromptVersion[];
  },

  /**
   * One row per state key; the caller decides which keys are safe to publish.
   * `prefix` narrows in SQL: values such as the system prompt or the ebook
   * are large, and loading them only to drop them was most of the query.
   */
  getStateEntries(limit = 200, prefix = ""): AgentState[] {
    if (!prefix) {
      return stmt("SELECT * FROM agent_state ORDER BY key ASC LIMIT ?").all(
        limit,
      ) as AgentState[];
    }
    // A primary-key range: every key that starts with `prefix`.
    const upper =
      prefix.slice(0, -1) +
      String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);
    return stmt(
      `SELECT * FROM agent_state WHERE key >= ? AND key < ?
       ORDER BY key ASC LIMIT ?`,
    ).all(prefix, upper, limit) as AgentState[];
  },

  /** When a key was last written, without reading its value. */
  getStateUpdatedAt(key: string): string | null {
    const row = stmt("SELECT updated_at FROM agent_state WHERE key = ?").get(
      key,
    ) as { updated_at: string } | undefined;
    return row?.updated_at ?? null;
  },

  getSourceHealthAll(limit = 200): SourceHealth[] {
    return stmt(
      `SELECT * FROM source_health
       ORDER BY consecutive_failures DESC, source ASC
       LIMIT ?`,
    ).all(limit) as SourceHealth[];
  },

  /** Crawl volume per source label over the recency window. */
  getSourceTotals(sinceDays: number, limit = 200): SourceTotal[] {
    return stmt(
      `SELECT source, count(*) AS total, max(crawled_at) AS last_seen
       FROM articles
       WHERE crawled_at >= datetime('now', ?)
       GROUP BY source
       ORDER BY total DESC, source ASC
       LIMIT ?`,
    ).all(`-${sinceDays} days`, limit) as SourceTotal[];
  },

  getMetricSummary(
    sinceHours: number,
    name?: string,
    limit = 50,
  ): MetricSummary[] {
    const filter = name ? "AND name = ?" : "";
    const params: Array<string | number> = [`-${sinceHours} hours`];
    if (name) params.push(name);
    return stmt(
      `SELECT name,
              count(*) AS samples,
              avg(value) AS average,
              min(value) AS minimum,
              max(value) AS maximum,
              max(recorded_at) AS lastRecorded
       FROM metric_events
       WHERE recorded_at >= datetime('now', ?) ${filter}
       GROUP BY name
       ORDER BY lastRecorded DESC
       LIMIT ?`,
    ).all(...params, limit) as MetricSummary[];
  },

  getMetricPoints(
    name: string,
    sinceHours: number,
    limit = 120,
  ): MetricEvent[] {
    return stmt(
      `SELECT * FROM metric_events
       WHERE name = ? AND recorded_at >= datetime('now', ?)
       ORDER BY recorded_at DESC, id DESC
       LIMIT ?`,
    ).all(name, `-${sinceHours} hours`, limit) as MetricEvent[];
  },
};
