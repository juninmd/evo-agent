import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";
import { migrate } from "./schema.js";

let _db: Database.Database | null = null;

/** The process-wide connection, opened and migrated on first use. */
export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(config.dbPath), { recursive: true });
  _db = new Database(config.dbPath);
  _db.pragma("journal_mode = WAL");
  // Reclaims space incrementally; full VACUUM would block the event loop on a
  // large DB. Existing databases only pick this up after their next VACUUM.
  _db.pragma("auto_vacuum = INCREMENTAL");
  migrate(_db);
  return _db;
}

const _stmtCache = new Map<string, Database.Statement>();

/**
 * Memoized prepared statements, keyed by SQL text: re-preparing on every call
 * makes SQLite parse and plan the same query again. Every module that queries
 * the knowledge base goes through here; dynamic SQL is fine as long as the set
 * of distinct texts is bounded (filters, not interpolated values).
 */
export function stmt(sql: string): Database.Statement {
  let statement = _stmtCache.get(sql);
  if (!statement) {
    statement = getDb().prepare(sql);
    _stmtCache.set(sql, statement);
  }
  return statement;
}

/** ISO string with 'T' and millis → SQLite format 'YYYY-MM-DD HH:MM:SS'. */
export function sqliteTs(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, "");
}
