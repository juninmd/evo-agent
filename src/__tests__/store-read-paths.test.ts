import { describe, expect, it } from "vitest";
import { db, getDb } from "../knowledge/store.js";

describe("read-path indexes", () => {
  const plan = (sql: string, ...params: unknown[]) =>
    (
      getDb()
        .prepare(`EXPLAIN QUERY PLAN ${sql}`)
        .all(...params) as Array<{ detail: string }>
    )
      .map((row) => row.detail)
      .join(" | ");

  it("creates the indexes the console read paths rely on", () => {
    const names = (
      getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "idx_cycle_runs_started_at",
        "idx_cycle_runs_status_started",
        "idx_published_articles_url",
        "idx_published_articles_published_at",
        "idx_published_articles_listing",
        "idx_metric_events_name_recorded",
      ]),
    );
  });

  // A scan plus "USE TEMP B-TREE FOR ORDER BY" is what grew with the table.
  it("lists cycles and editions straight from an index", () => {
    const cycles = plan(
      "SELECT * FROM cycle_runs ORDER BY started_at DESC, id DESC LIMIT 50",
    );
    expect(cycles).toContain("idx_cycle_runs_started_at");
    expect(cycles).not.toContain("TEMP B-TREE");

    const editions = plan(
      `SELECT * FROM published_articles
       ORDER BY date DESC, published_at DESC, id DESC LIMIT 50`,
    );
    expect(editions).toContain("idx_published_articles_listing");
    expect(editions).not.toContain("TEMP B-TREE");

    expect(
      plan("SELECT id FROM published_articles WHERE url = ?", "https://x"),
    ).toContain("idx_published_articles_url");
    expect(
      plan(
        `SELECT * FROM metric_events
         WHERE name = ? AND recorded_at >= datetime('now', ?)
         ORDER BY recorded_at DESC, id DESC LIMIT 120`,
        "llm.latency_ms",
        "-48 hours",
      ),
    ).toContain("idx_metric_events_name_recorded");
  });
});

describe("agent state reads", () => {
  it("narrows by key prefix in SQL and reads a timestamp without the value", () => {
    db.setState("last_probe_at", "2026-10-17T00:00:00.000Z");
    db.setState("last_other_at", "2026-10-18T00:00:00.000Z");
    db.setState("lasz_not_matching", "x");
    db.setState("system_prompt", "segredo ".repeat(100));

    const keys = db.getStateEntries(500, "last_").map((entry) => entry.key);
    expect(keys).toContain("last_probe_at");
    expect(keys).toContain("last_other_at");
    expect(keys.every((key) => key.startsWith("last_"))).toBe(true);
    expect(
      db.getStateEntries(500).some((entry) => entry.key === "system_prompt"),
    ).toBe(true);

    expect(db.getStateUpdatedAt("system_prompt")).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    );
    expect(db.getStateUpdatedAt("never-written")).toBeNull();
  });
});
