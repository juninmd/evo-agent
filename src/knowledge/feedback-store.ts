import type Database from "better-sqlite3";
import { getDb } from "./store.js";

export type Vote = "up" | "down" | "known";

export interface FeedbackItem {
  key: string;
  url: string;
  source: string;
  title: string;
}

let migrated: Database.Database | null = null;

function conn(): Database.Database {
  const db = getDb();
  if (migrated !== db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS feedback_items (
        key TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS feedback_votes (
        update_id INTEGER PRIMARY KEY,
        key TEXT NOT NULL,
        vote TEXT NOT NULL CHECK (vote IN ('up', 'down', 'known')),
        voted_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_votes_key ON feedback_votes(key);
    `);
    migrated = db;
  }
  return db;
}

export const feedbackStore = {
  register(item: FeedbackItem) {
    conn()
      .prepare(
        `INSERT OR IGNORE INTO feedback_items (key, url, source, title)
         VALUES (@key, @url, @source, @title)`,
      )
      .run(item);
  },

  item(key: string): FeedbackItem | null {
    return (
      (conn()
        .prepare(
          "SELECT key, url, source, title FROM feedback_items WHERE key = ?",
        )
        .get(key) as FeedbackItem | undefined) ?? null
    );
  },

  /** update_id is Telegram's own id: a replayed update never counts twice. */
  vote(updateId: number, key: string, vote: Vote): boolean {
    return (
      conn()
        .prepare(
          "INSERT OR IGNORE INTO feedback_votes (update_id, key, vote) VALUES (?, ?, ?)",
        )
        .run(updateId, key, vote).changes > 0
    );
  },

  /** Votes per source in the window, for the ranking weights. */
  tallies(days = 90): Array<{ source: string; vote: Vote; count: number }> {
    return conn()
      .prepare(
        `SELECT i.source AS source, v.vote AS vote, COUNT(*) AS count
         FROM feedback_votes v JOIN feedback_items i ON i.key = v.key
         WHERE v.voted_at >= datetime('now', ?)
         GROUP BY i.source, v.vote`,
      )
      .all(`-${days} days`) as Array<{
      source: string;
      vote: Vote;
      count: number;
    }>;
  },
};

/**
 * -1..1 per source. "Já sabia" costs half a downvote: the item was right,
 * just late. The +2 prior keeps one vote from swinging a source.
 */
export function sourceWeights(
  tallies: Array<{ source: string; vote: Vote; count: number }>,
): Map<string, number> {
  const totals = new Map<string, { up: number; down: number; known: number }>();
  for (const row of tallies) {
    const entry = totals.get(row.source) ?? { up: 0, down: 0, known: 0 };
    entry[row.vote] += row.count;
    totals.set(row.source, entry);
  }
  const weights = new Map<string, number>();
  for (const [source, t] of totals) {
    const n = t.up + t.down + t.known;
    weights.set(source, (t.up - t.down - 0.5 * t.known) / (n + 2));
  }
  return weights;
}
