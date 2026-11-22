import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-ebook-day-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "ebook.db"), timezone: "America/Sao_Paulo" },
}));

const { db, getDb } = await import("../knowledge/store.js");
const { EBOOK_STATE_KEY, refineEbook } = await import("../agent/ebook.js");

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  // Windows keeps the file locked while the SQLite handle is open.
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

describe("refineEbook edition day", () => {
  it("stamps the configured-timezone day, not the UTC day, in the evening", async () => {
    db.setState(EBOOK_STATE_KEY, "# Guia\n\n> Resumo do guia.");
    // 22:00 on 22 Nov in Sao Paulo is already 23 Nov in UTC.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-23T01:00:00Z"));

    const result = await refineEbook();

    expect(result.date).toBe("2026-11-22");
  });
});
