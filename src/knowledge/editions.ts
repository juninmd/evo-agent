import { type EditionStatus, type PublishedArticle, getDb } from "./store.js";

export interface EditionQuery {
  kind?: "article" | "report";
  notificationStatus?: PublishedArticle["notification_status"];
  status?: EditionStatus;
  /** Matches title, summary, tags and the excerpts of the cited evidence. */
  q?: string;
  tag?: string;
  /** Inclusive local-day bounds, YYYY-MM-DD. */
  from?: string;
  to?: string;
  maxScore?: number;
  sort?: "date" | "score";
  limit: number;
  offset: number;
}

export interface RevisionMeta {
  revision: number;
  reason: string;
  contentHash: string;
  createdAt: string;
}

export interface CalendarDay {
  date: string;
  published: number;
  failedNotifications: number;
}

type Row = Omit<PublishedArticle, "tags" | "editorial_metrics"> & {
  tags: string;
  editorial_metrics: string;
};

/** `%`, `_` and the escape itself are literals inside a user-typed search. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function likePattern(term: string): string {
  return `%${escapeLike(term)}%`;
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function hydrate(row: Row): PublishedArticle {
  return {
    ...row,
    tags: parseList(row.tags),
    editorial_metrics: parseObject(row.editorial_metrics),
  };
}

function whereFor(query: EditionQuery): {
  sql: string;
  params: Array<string | number>;
} {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (query.kind) {
    where.push("kind = ?");
    params.push(query.kind);
  }
  if (query.notificationStatus) {
    where.push("notification_status = ?");
    params.push(query.notificationStatus);
  }
  if (query.status) {
    where.push("status = ?");
    params.push(query.status);
  }
  if (query.from) {
    where.push("date >= ?");
    params.push(query.from);
  }
  if (query.to) {
    where.push("date <= ?");
    params.push(query.to);
  }
  if (query.maxScore !== undefined) {
    where.push("quality_score IS NOT NULL AND quality_score <= ?");
    params.push(query.maxScore);
  }
  if (query.tag) {
    where.push("tags LIKE ? ESCAPE '\\'");
    // Tags are stored as a JSON array, so the quotes make it a whole-tag match.
    params.push(`%"${escapeLike(JSON.stringify(query.tag).slice(1, -1))}"%`);
  }
  if (query.q) {
    const pattern = likePattern(query.q);
    where.push(
      `(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\'
        OR tags LIKE ? ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM published_evidence e
                   WHERE e.article_url = published_articles.url
                     AND (e.excerpt LIKE ? ESCAPE '\\'
                          OR e.source_title LIKE ? ESCAPE '\\')))`,
    );
    params.push(pattern, pattern, pattern, pattern, pattern);
  }
  return {
    sql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

/** Filtered, paginated listing with the real match count. */
export function queryEditions(query: EditionQuery): {
  total: number;
  items: PublishedArticle[];
} {
  const db = getDb();
  const { sql, params } = whereFor(query);
  const total = (
    db
      .prepare(`SELECT count(*) AS total FROM published_articles ${sql}`)
      .get(...params) as { total: number }
  ).total;
  const order =
    query.sort === "score"
      ? "quality_score IS NULL, quality_score DESC, published_at DESC, id DESC"
      : "date DESC, published_at DESC, id DESC";
  const rows = db
    .prepare(
      `SELECT * FROM published_articles ${sql}
       ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(...params, query.limit, query.offset) as Row[];
  return { total, items: rows.map(hydrate) };
}

export function getRevisions(url: string): RevisionMeta[] {
  const rows = getDb()
    .prepare(
      `SELECT revision, reason, content_hash AS contentHash, created_at AS createdAt
       FROM edition_revisions WHERE edition_url = ? ORDER BY revision DESC`,
    )
    .all(url) as RevisionMeta[];
  return rows;
}

/** Latest revision when `revision` is omitted. */
export function getRevisionContent(
  url: string,
  revision?: number,
): { revision: number; content: string } | null {
  const db = getDb();
  const row = (
    revision === undefined
      ? db
          .prepare(
            `SELECT revision, content FROM edition_revisions
             WHERE edition_url = ? ORDER BY revision DESC LIMIT 1`,
          )
          .get(url)
      : db
          .prepare(
            `SELECT revision, content FROM edition_revisions
             WHERE edition_url = ? AND revision = ?`,
          )
          .get(url, revision)
  ) as { revision: number; content: string } | undefined;
  return row ?? null;
}

/**
 * One row per local day that has at least one article edition. The caller fills
 * the gaps: a missing day is a day with zero editions, which is the signal.
 */
export function editionCalendar(fromDay: string): CalendarDay[] {
  return getDb()
    .prepare(
      `SELECT date,
              count(*) AS published,
              sum(CASE WHEN notification_status = 'dead_letter' THEN 1 ELSE 0 END)
                AS failedNotifications
       FROM published_articles
       WHERE kind = 'article' AND status <> 'retracted' AND date >= ?
       GROUP BY date
       ORDER BY date`,
    )
    .all(fromDay) as CalendarDay[];
}

/**
 * Puts a delivered, suppressed or dead-lettered notification back in the
 * outbox. Returns false when the slug is unknown or the edition was retracted.
 */
export function requeueNotification(slug: string): boolean {
  return (
    getDb()
      .prepare(
        `UPDATE published_articles
         SET notification_status = 'pending',
             notification_attempts = 0,
             next_notification_at = datetime('now'),
             notification_error = NULL
         WHERE slug = ? AND status <> 'retracted'`,
      )
      .run(slug).changes > 0
  );
}

export function markRetracted(
  url: string,
  reason: string,
  content: string,
): number {
  const db = getDb();
  const apply = db.transaction(() => {
    const last = db
      .prepare(
        "SELECT max(revision) AS revision FROM edition_revisions WHERE edition_url = ?",
      )
      .get(url) as { revision: number | null };
    const revision = (last.revision ?? 0) + 1;
    db.prepare(
      `INSERT INTO edition_revisions
         (edition_url, revision, content, content_hash, reason)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      url,
      revision,
      content,
      `retracted-${revision}`,
      `retracted: ${reason}`,
    );
    db.prepare(
      `UPDATE published_articles
       SET status = 'retracted', revision = ?,
           notification_status = CASE WHEN notification_status = 'pending'
             THEN 'suppressed' ELSE notification_status END
       WHERE url = ?`,
    ).run(revision, url);
    return revision;
  });
  return apply();
}

export function setQualityScore(url: string, score: number | null) {
  getDb()
    .prepare("UPDATE published_articles SET quality_score = ? WHERE url = ?")
    .run(score, url);
}

export function countEvidence(url: string): number {
  return (
    getDb()
      .prepare(
        "SELECT count(*) AS total FROM published_evidence WHERE article_url = ?",
      )
      .get(url) as { total: number }
  ).total;
}

/**
 * Source URLs cited by the visible article editions dated `fromDay` or later.
 * The daily draft looks two days back, so without this a story covered
 * yesterday is eligible again today.
 */
export function recentEvidenceUrls(fromDay: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT e.source_url AS sourceUrl
       FROM published_evidence e
       JOIN published_articles p ON p.url = e.article_url
       WHERE p.kind = 'article' AND p.status <> 'retracted' AND p.date >= ?`,
    )
    .all(fromDay) as Array<{ sourceUrl: string }>;
  return rows.map((row) => row.sourceUrl);
}
