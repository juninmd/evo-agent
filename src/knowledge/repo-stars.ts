import type Database from "better-sqlite3";
import { getDb } from "./store.js";

export interface StarSnapshot {
  repo: string;
  day: string;
  stars: number;
  starsToday: number;
  description: string;
  createdAt: string | null;
}

let migrated: Database.Database | null = null;

/** Own table, own migration: the shared store stays untouched by this feature. */
function conn(): Database.Database {
  const db = getDb();
  if (migrated !== db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS repo_stars (
        repo TEXT NOT NULL,
        day TEXT NOT NULL,
        stars INTEGER NOT NULL,
        stars_today INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT,
        PRIMARY KEY (repo, day)
      );
      CREATE INDEX IF NOT EXISTS idx_repo_stars_day ON repo_stars(day);
    `);
    migrated = db;
  }
  return db;
}

export const repoStars = {
  /** Idempotent per day: hourly crawls keep the highest reading. */
  record(snapshot: Omit<StarSnapshot, "createdAt">) {
    conn()
      .prepare(
        `INSERT INTO repo_stars (repo, day, stars, stars_today, description)
         VALUES (@repo, @day, @stars, @starsToday, @description)
         ON CONFLICT(repo, day) DO UPDATE SET
           stars = MAX(stars, excluded.stars),
           stars_today = MAX(stars_today, excluded.stars_today),
           description = excluded.description`,
      )
      .run(snapshot);
  },

  since(day: string, limit = 5000): StarSnapshot[] {
    return conn()
      .prepare(
        `SELECT repo, day, stars, stars_today AS starsToday, description,
                created_at AS createdAt
         FROM repo_stars WHERE day >= ? ORDER BY day DESC LIMIT ?`,
      )
      .all(day, limit) as StarSnapshot[];
  },

  /** Repos never enriched with their creation date, most starred today first. */
  missingCreatedAt(day: string, limit: number): string[] {
    return (
      conn()
        .prepare(
          `SELECT repo FROM repo_stars
           WHERE day = ? AND repo NOT IN
             (SELECT repo FROM repo_stars WHERE created_at IS NOT NULL)
           ORDER BY stars_today DESC LIMIT ?`,
        )
        .all(day, limit) as Array<{ repo: string }>
    ).map((row) => row.repo);
  },

  setCreatedAt(repo: string, createdAt: string) {
    conn()
      .prepare("UPDATE repo_stars SET created_at = ? WHERE repo = ?")
      .run(createdAt, repo);
  },
};
