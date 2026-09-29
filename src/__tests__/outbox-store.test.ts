import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-outbox-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "outbox.db"), timezone: "America/Sao_Paulo" },
}));

const { db, getDb } = await import("../knowledge/store.js");

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  getDb().exec("DELETE FROM published_articles; DELETE FROM cycle_runs;");
});

function publishPending(slug: string, publishedAt: string) {
  db.savePublished({
    slug,
    title: slug,
    url: `https://example.com/${slug}`,
    date: publishedAt.slice(0, 10),
    summary: "",
    tags: [],
    kind: "report",
  });
  getDb()
    .prepare("UPDATE published_articles SET published_at = ? WHERE slug = ?")
    .run(publishedAt, slug);
}

function cycle(type: string, status: string, startedAt: string) {
  getDb()
    .prepare(
      "INSERT INTO cycle_runs (type, status, started_at) VALUES (?, ?, datetime('now', ?))",
    )
    .run(type, status, startedAt);
}

describe("stale notification outbox", () => {
  it("suppresses notifications that missed their delivery window instead of sending them late", () => {
    publishPending("old-radar", "2026-08-06 23:32:06");
    publishPending("fresh-radar", new Date().toISOString().slice(0, 19));

    expect(db.suppressStaleNotifications(24)).toBe(1);

    const rows = getDb()
      .prepare(
        "SELECT slug, notification_status AS status FROM published_articles ORDER BY slug",
      )
      .all();
    expect(rows).toEqual([
      { slug: "fresh-radar", status: "pending" },
      { slug: "old-radar", status: "suppressed" },
    ]);
  });

  it("counts pending notifications the outbox never drained", () => {
    publishPending("stuck", "2026-08-06 23:32:06");
    publishPending("fresh", new Date().toISOString().slice(0, 19));

    const stats = db.getOperationalStats();
    expect(stats.pendingNotifications).toBe(2);
    expect(stats.stalePendingNotifications).toBe(1);
  });
});

describe("failed cycle accounting", () => {
  it("keeps a radar failure visible even when later crawls succeed", () => {
    cycle("radar", "failed", "-3 hours");
    cycle("crawl", "succeeded", "-1 hours");

    expect(db.getOperationalStats().failedCycles24h).toBe(1);
  });

  it("clears a failure once the same cycle type succeeds again", () => {
    cycle("radar", "failed", "-3 hours");
    cycle("radar", "succeeded", "-2 hours");

    expect(db.getOperationalStats().failedCycles24h).toBe(0);
  });
});
