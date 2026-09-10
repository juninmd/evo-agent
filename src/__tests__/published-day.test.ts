import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-day-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "day.db"), timezone: "America/Sao_Paulo" },
}));

const { db, getDb } = await import("../knowledge/store.js");
const { localDayIso } = await import("../utils/date.js");

afterAll(() => {
  // Windows keeps the file locked while the SQLite handle is open.
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

function publish(slug: string, date: string, kind: "article" | "report") {
  db.savePublished({
    slug,
    title: slug,
    url: `https://example.com/${slug}`,
    date,
    summary: "",
    tags: [],
    kind,
  });
}

describe("countPublishedOn", () => {
  it("counts only the given kind on the given day", () => {
    publish("a", "2026-06-09", "article");
    publish("b", "2026-06-09", "article");
    publish("c", "2026-06-09", "report");
    publish("d", "2026-06-10", "article");

    expect(db.countPublishedOn("article", "2026-06-09")).toBe(2);
    expect(db.countPublishedOn("report", "2026-06-09")).toBe(1);
    expect(db.countPublishedOn("article", "2026-06-11")).toBe(0);
  });

  // The daily-edition budget is keyed by the same day string the writer
  // stamps (localDayIso). Counting with the UTC day instead resolved to the
  // next day after 21:00 BRT, found zero editions, and let the end-of-day
  // sweep republish the whole budget.
  it("does not see an edition under a neighbouring day key", () => {
    const evening = new Date("2026-07-16T02:30:00.000Z");
    const local = localDayIso(evening);
    const utcDay = evening.toISOString().slice(0, 10);
    publish("evening-edition", local, "article");

    expect(db.countPublishedOn("article", local)).toBe(1);
    for (const shift of [-1, 1]) {
      const other = new Date(evening);
      other.setDate(other.getDate() + shift);
      expect(db.countPublishedOn("article", localDayIso(other))).toBe(0);
    }
    if (utcDay !== local) {
      expect(db.countPublishedOn("article", utcDay)).toBe(0);
    }
  });
});
