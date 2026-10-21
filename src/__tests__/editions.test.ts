import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import {
  QUALITY_WEIGHTS,
  qualityFeedback,
  scoreEdition,
} from "../agent/quality.js";
import {
  editionCalendar,
  getRevisionContent,
  getRevisions,
  markRetracted,
  queryEditions,
  recentEvidenceUrls,
  requeueNotification,
} from "../knowledge/editions.js";
import { db, getDb, migrate, qualifiedSlug } from "../knowledge/store.js";
import { pagePathFromUrl, retractionNotice } from "../publisher/lifecycle.js";
import { buildMarkdown } from "../publisher/site-renderer.js";
import { addDays } from "../utils/date.js";

afterAll(() => getDb().close());

function publish(
  slug: string,
  overrides: Partial<Parameters<typeof db.savePublished>[0]> = {},
) {
  db.savePublished({
    slug,
    title: `Título ${slug}`,
    url: `https://pages.test/articles/${slug}`,
    date: "2026-10-01",
    summary: "resumo",
    tags: ["ai"],
    kind: "article",
    ...overrides,
  });
}

describe("qualifiedSlug", () => {
  it("prefixes the date unless the slug already carries it", () => {
    expect(qualifiedSlug("claude-code", "2026-10-01")).toBe(
      "2026-10-01-claude-code",
    );
    expect(qualifiedSlug("radar-2026-10-01", "2026-10-01")).toBe(
      "radar-2026-10-01",
    );
  });

  it("keeps the same title on two days as two editions", () => {
    publish(qualifiedSlug("mesmo-titulo", "2026-10-02"), {
      date: "2026-10-02",
      url: "https://pages.test/articles/2026-10-02-mesmo-titulo",
    });
    publish(qualifiedSlug("mesmo-titulo", "2026-10-03"), {
      date: "2026-10-03",
      url: "https://pages.test/articles/2026-10-03-mesmo-titulo",
    });
    expect(
      queryEditions({ q: "mesmo-titulo", limit: 10, offset: 0 }).total,
    ).toBe(2);
  });
});

describe("legacy slug migration", () => {
  it("dates old slugs once and leaves slugs that already carry the date", () => {
    const legacy = new Database(":memory:");
    migrate(legacy);
    const insert = legacy.prepare(
      "INSERT INTO published_articles (slug, title, url, date) VALUES (?, ?, ?, ?)",
    );
    insert.run("so-titulo", "A", "https://x.test/a", "2026-09-01");
    insert.run("radar-2026-09-02", "B", "https://x.test/b", "2026-09-02");

    migrate(legacy);
    migrate(legacy);

    const slugs = legacy
      .prepare("SELECT slug FROM published_articles ORDER BY id")
      .all() as Array<{ slug: string }>;
    expect(slugs.map((row) => row.slug)).toEqual([
      "2026-09-01-so-titulo",
      "radar-2026-09-02",
    ]);
    legacy.close();
  });

  it("keeps the old slug when the dated one is taken", () => {
    const legacy = new Database(":memory:");
    migrate(legacy);
    const insert = legacy.prepare(
      "INSERT INTO published_articles (slug, title, url, date) VALUES (?, ?, ?, ?)",
    );
    insert.run("2026-09-01-x", "A", "https://x.test/a", "2026-09-01");
    insert.run("x", "B", "https://x.test/b", "2026-09-01");
    migrate(legacy);
    const slugs = legacy
      .prepare("SELECT slug FROM published_articles ORDER BY id")
      .all() as Array<{ slug: string }>;
    expect(slugs.map((row) => row.slug)).toEqual(["2026-09-01-x", "x"]);
    legacy.close();
  });
});

describe("republishing", () => {
  it("keeps the notification state of an existing edition", () => {
    publish("rep-1", { content: "v1" });
    db.markNotificationDelivered("https://pages.test/articles/rep-1");
    publish("rep-1", { content: "v2", title: "Título corrigido" });

    const row = db.getPublishedBySlug("rep-1");
    expect(row?.title).toBe("Título corrigido");
    expect(row?.notification_status).toBe("delivered");
    expect(row?.notification_attempts).toBe(1);
  });

  it("applies an explicit notification status to an existing edition", () => {
    publish("rep-2");
    db.markNotificationDelivered("https://pages.test/articles/rep-2");
    publish("rep-2", { notificationStatus: "suppressed" });
    expect(db.getPublishedBySlug("rep-2")?.notification_status).toBe(
      "suppressed",
    );
  });
});

describe("revisions", () => {
  const url = "https://pages.test/articles/rev-1";

  it("records the first body as revision 1 without marking a correction", () => {
    publish("rev-1", { content: "corpo A" });
    expect(getRevisions(url)).toMatchObject([
      { revision: 1, reason: "initial" },
    ]);
    expect(db.getPublishedBySlug("rev-1")).toMatchObject({
      revision: 1,
      status: "published",
    });
  });

  it("ignores an unchanged body and versions a changed one", () => {
    publish("rev-1", { content: "corpo A" });
    expect(getRevisions(url)).toHaveLength(1);

    publish("rev-1", { content: "corpo B", revisionReason: "fato corrigido" });
    expect(getRevisions(url).map((r) => r.revision)).toEqual([2, 1]);
    expect(db.getPublishedBySlug("rev-1")).toMatchObject({
      revision: 2,
      status: "corrected",
    });
    expect(getRevisionContent(url)).toEqual({
      revision: 2,
      content: "corpo B",
    });
    expect(getRevisionContent(url, 1)?.content).toBe("corpo A");
    expect(getRevisionContent(url, 9)).toBeNull();
  });

  it("treats the first body of a pre-revision row as a baseline", () => {
    publish("rev-legacy");
    publish("rev-legacy", { content: "primeiro corpo guardado" });
    expect(
      getRevisions("https://pages.test/articles/rev-legacy"),
    ).toMatchObject([{ revision: 1, reason: "baseline" }]);
    expect(db.getPublishedBySlug("rev-legacy")?.status).toBe("published");
  });

  it("drops revisions together with a publication that never landed", () => {
    publish("rev-gone", { content: "x" });
    db.deletePublishedByUrl("https://pages.test/articles/rev-gone");
    expect(getRevisions("https://pages.test/articles/rev-gone")).toEqual([]);
  });
});

describe("queryEditions", () => {
  it("filters by text, tag, day range and reports the real total", () => {
    for (let i = 1; i <= 5; i++) {
      publish(`q-${i}`, {
        title: i === 3 ? "Gemini 100% novo" : `Edição de busca ${i}`,
        date: `2026-11-0${i}`,
        tags: i % 2 ? ["mcp", "agentes"] : ["modelos"],
        evidence:
          i === 4
            ? [
                {
                  sourceUrl: "https://src.test/4",
                  sourceTitle: "Fonte",
                  excerpt: "janela de contexto de um milhão",
                },
              ]
            : [],
      });
    }

    const page = queryEditions({ q: "busca", limit: 2, offset: 0 });
    expect(page.total).toBe(4);
    expect(page.items).toHaveLength(2);
    expect(
      queryEditions({ q: "busca", limit: 2, offset: 2 }).items,
    ).toHaveLength(2);

    expect(queryEditions({ tag: "mcp", limit: 50, offset: 0 }).total).toBe(3);
    expect(queryEditions({ tag: "mc", limit: 50, offset: 0 }).total).toBe(0);
    expect(
      queryEditions({
        from: "2026-11-02",
        to: "2026-11-04",
        limit: 50,
        offset: 0,
      }).total,
    ).toBe(3);
    expect(
      queryEditions({ q: "milhão", limit: 50, offset: 0 }).items[0].slug,
    ).toBe("q-4");
  });

  it("treats LIKE wildcards in the search as literals", () => {
    expect(queryEditions({ q: "100%", limit: 10, offset: 0 }).total).toBe(1);
    expect(queryEditions({ q: "%", limit: 10, offset: 0 }).total).toBe(1);
    expect(queryEditions({ q: "_", limit: 10, offset: 0 }).total).toBe(0);
  });

  it("orders by score with unscored editions last", () => {
    publish("s-low", { qualityScore: 30, date: "2026-12-01" });
    publish("s-high", { qualityScore: 90, date: "2026-12-02" });
    publish("s-none", { date: "2026-12-03" });
    const sorted = queryEditions({
      from: "2026-12-01",
      sort: "score",
      limit: 10,
      offset: 0,
    }).items.map((item) => item.slug);
    expect(sorted).toEqual(["s-high", "s-low", "s-none"]);
    expect(
      queryEditions({
        from: "2026-12-01",
        maxScore: 50,
        limit: 10,
        offset: 0,
      }).items.map((item) => item.slug),
    ).toEqual(["s-low"]);
  });
});

describe("notification requeue and retraction", () => {
  it("puts a dead-lettered notification back as pending", () => {
    publish("rq-1");
    db.markNotificationFailed(
      "https://pages.test/articles/rq-1",
      "boom",
      "2026-10-01T00:00:00.000Z",
      true,
    );
    expect(requeueNotification("rq-1")).toBe(true);
    expect(db.getPublishedBySlug("rq-1")).toMatchObject({
      notification_status: "pending",
      notification_attempts: 0,
      notification_error: null,
    });
    expect(requeueNotification("missing")).toBe(false);
  });

  it("retracts: suppresses a pending ping, versions the notice, leaves the calendar", () => {
    publish("rt-1", { date: "2027-01-10", content: "original" });
    publish("rt-2", { date: "2027-01-10", content: "outra" });
    expect(editionCalendar("2027-01-01")[0].published).toBe(2);

    const revision = markRetracted(
      "https://pages.test/articles/rt-1",
      "sem fonte",
      "aviso",
    );
    expect(revision).toBe(2);
    expect(db.getPublishedBySlug("rt-1")).toMatchObject({
      status: "retracted",
      notification_status: "suppressed",
    });
    expect(editionCalendar("2027-01-01")[0].published).toBe(1);
    expect(requeueNotification("rt-1")).toBe(false);

    publish("rt-1", { date: "2027-01-10", content: "original" });
    expect(db.getPublishedBySlug("rt-1")?.status).toBe("retracted");
  });

  it("counts dead letters per day in the calendar", () => {
    publish("cal-1", { date: "2027-02-01" });
    db.markNotificationFailed(
      "https://pages.test/articles/cal-1",
      "x",
      "2027-02-01T00:00:00.000Z",
      true,
    );
    expect(editionCalendar("2027-02-01")).toEqual([
      { date: "2027-02-01", published: 1, failedNotifications: 1 },
    ]);
  });
});

describe("retraction page", () => {
  it("maps a page url to its repository path", () => {
    expect(
      pagePathFromUrl("https://o.github.io/repo/articles/2026-10-01-x"),
    ).toBe("articles/2026-10-01-x.md");
    expect(
      pagePathFromUrl("https://o.github.io/repo/reports/weekly-2026-10-01-x/"),
    ).toBe("reports/weekly-2026-10-01-x.md");
  });

  it("keeps the title and states the reason", () => {
    const notice = retractionNotice(
      { title: "Título", date: "2026-10-01" },
      "contagem sem fonte",
      "2026-10-05",
    );
    expect(notice.content).toContain("Edição retirada em 2026-10-05");
    expect(notice.content).toContain("contagem sem fonte");
    expect(notice.title).toBe("Título");
  });
});

describe("scoreEdition", () => {
  const strong = {
    selected: 20,
    primarySources: 8,
    communitySignals: 5,
  };

  it("scores a well-anchored edition high and a thin one low", () => {
    expect(scoreEdition(strong, 20)?.score).toBe(100);
    const thin = scoreEdition({ selected: 4, primarySources: 0 }, 1);
    expect(thin?.score).toBeLessThan(30);
  });

  it("has no score for pages without a curated selection", () => {
    expect(scoreEdition({}, 0)).toBeNull();
    expect(scoreEdition({ selected: 0 }, 3)).toBeNull();
  });

  it("clamps every facet to 0-100", () => {
    const quality = scoreEdition(
      { selected: 100, primarySources: 100, communitySignals: 100 },
      500,
    );
    expect(Object.values(quality?.breakdown ?? {}).every((v) => v <= 100)).toBe(
      true,
    );
  });
});

describe("qualityFeedback", () => {
  it("names the weakest facet of the recent editions", () => {
    const line = qualityFeedback([
      {
        metrics: { selected: 20, primarySources: 8, communitySignals: 0 },
        evidenceCount: 20,
      },
      {
        metrics: { selected: 20, primarySources: 8, communitySignals: 0 },
        evidenceCount: 20,
      },
    ]);
    expect(line).toContain("last 2 editions");
    expect(line).toContain("community signals (0/100)");
  });

  it("is empty when nothing scoreable exists", () => {
    expect(qualityFeedback([])).toBe("");
    expect(qualityFeedback([{ metrics: {}, evidenceCount: 0 }])).toBe("");
  });
});

describe("recentEvidenceUrls", () => {
  const evidence = (url: string) => [
    { sourceUrl: url, sourceTitle: "t", excerpt: "trecho" },
  ];

  it("returns sources of visible article editions from the given day on", () => {
    publish("ev-old", {
      date: "2030-03-01",
      evidence: evidence("https://src.test/old"),
    });
    publish("ev-yesterday", {
      date: "2030-03-09",
      evidence: evidence("https://src.test/yesterday"),
    });
    publish("ev-today", {
      date: "2030-03-10",
      evidence: evidence("https://src.test/today"),
    });
    publish("ev-report", {
      date: "2030-03-10",
      kind: "report",
      evidence: evidence("https://src.test/report"),
    });
    publish("ev-gone", {
      date: "2030-03-10",
      evidence: evidence("https://src.test/gone"),
    });
    markRetracted("https://pages.test/articles/ev-gone", "x", "aviso");

    expect(recentEvidenceUrls("2030-03-09").sort()).toEqual([
      "https://src.test/today",
      "https://src.test/yesterday",
    ]);
  });
});

describe("quality weights and day arithmetic", () => {
  it("keeps the weights summing to 1 so a perfect edition scores 100", () => {
    const sum = Object.values(QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("moves a day key across month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("opts a page out of the sitemap only when asked", () => {
    const base = {
      title: "T",
      slug: "t",
      content: "c",
      summary: "s",
      tags: [],
      date: "2026-10-20",
      sources: [],
      evidence: [],
      editorialMetrics: {
        considered: 0,
        selected: 0,
        rejected: 0,
        buckets: {},
        primarySources: 0,
      },
    };
    expect(buildMarkdown(base)).not.toContain("sitemap");
    expect(buildMarkdown(base, { hidden: true })).toContain(
      "sitemap: false\n---",
    );
  });
});
