import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiServer } from "../api/server.js";
import { markRetracted } from "../knowledge/editions.js";
import { db, getDb } from "../knowledge/store.js";
import { localDayIso } from "../utils/date.js";

const TOKEN = process.env.API_TOKEN ?? "";
let base = "";
let server: Server;

async function get(path: string) {
  const response = await fetch(`${base}${path}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  return { status: response.status, body: await response.json() };
}

function edition(n: number, date: string, content?: string) {
  db.savePublished({
    slug: `${date}-ed-${n}`,
    title: `Edição ${n} sobre agentes`,
    url: `https://pages.test/articles/${date}-ed-${n}`,
    date,
    summary: n === 2 ? "fala de janela de contexto" : "resumo",
    tags: n % 2 ? ["mcp"] : ["modelos"],
    kind: "article",
    qualityScore: n * 10,
    content,
    editorialMetrics: { selected: 5, primarySources: 2 },
  });
}

beforeAll(async () => {
  const today = localDayIso();
  for (let n = 1; n <= 4; n++) edition(n, today, `corpo ${n}`);
  edition(5, "2020-01-01");
  edition(1, today, "corpo 1 corrigido");
  markRetracted(`https://pages.test/articles/${today}-ed-4`, "erro", "aviso");

  // 12 sources, 3 primary: enough rows that a LIMIT would hide later ones.
  for (let n = 0; n < 12; n++) {
    db.saveArticle({
      title: `post ${n}`,
      source: n < 9 ? "Reddit: LocalLLaMA" : "Anthropic News",
      url: `https://example.test/${n}`,
      summary: "",
      tags: "[]",
    });
  }

  server = createApiServer();
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  getDb().close();
});

describe("GET /api/v1/editions", () => {
  it("answers the real total and honours offset", async () => {
    const first = await get("/api/v1/editions?limit=2");
    expect(first.body.total).toBe(5);
    expect(first.body.offset).toBe(0);
    expect(first.body.items).toHaveLength(2);

    const next = await get("/api/v1/editions?limit=2&offset=4");
    expect(next.body.items).toHaveLength(1);
    expect(next.body.offset).toBe(4);
  });

  it("searches summary and tag, and filters by lifecycle and score", async () => {
    const byText = await get("/api/v1/editions?q=janela");
    expect(byText.body.items).toHaveLength(1);

    const byTag = await get("/api/v1/editions?tag=mcp");
    expect(byTag.body.total).toBe(3);

    const retracted = await get("/api/v1/editions?lifecycle=retracted");
    expect(
      retracted.body.items.map((i: { status: string }) => i.status),
    ).toEqual(["retracted"]);

    const corrected = await get("/api/v1/editions?lifecycle=corrected");
    expect(corrected.body.total).toBe(1);

    const low = await get("/api/v1/editions?maxScore=20&sort=score");
    expect(
      low.body.items.map((i: { qualityScore: number }) => i.qualityScore),
    ).toEqual([20, 10]);
  });

  it("exposes status, score and revision on every edition", async () => {
    const { body } = await get("/api/v1/editions?tag=mcp&sort=score");
    expect(body.items[0]).toMatchObject({
      qualityScore: 50,
      status: "published",
      revision: 1,
    });
  });

  it("rejects malformed filters instead of ignoring them", async () => {
    expect((await get("/api/v1/editions?from=ontem")).status).toBe(400);
    expect((await get("/api/v1/editions?lifecycle=x")).status).toBe(400);
    expect((await get("/api/v1/editions?sort=x")).status).toBe(400);
    expect((await get("/api/v1/editions?offset=-1")).status).toBe(400);
  });
});

describe("edition detail, revisions and body", () => {
  const slug = `${localDayIso()}-ed-1`;

  it("lists revisions newest first without shipping the bodies", async () => {
    const { body } = await get(`/api/v1/editions/${slug}`);
    expect(body.edition).toMatchObject({ status: "corrected", revision: 2 });
    expect(body.revisions.map((r: { revision: number }) => r.revision)).toEqual(
      [2, 1],
    );
    expect(JSON.stringify(body.revisions)).not.toContain("corpo 1");
  });

  it("serves the latest or a given revision of the Markdown", async () => {
    expect((await get(`/api/v1/editions/${slug}/content`)).body).toEqual({
      revision: 2,
      markdown: "corpo 1 corrigido",
    });
    expect(
      (await get(`/api/v1/editions/${slug}/content?revision=1`)).body.markdown,
    ).toBe("corpo 1");
    expect(
      (await get(`/api/v1/editions/${slug}/content?revision=9`)).status,
    ).toBe(404);
    expect((await get("/api/v1/editions/nope/content")).status).toBe(404);
  });
});

describe("GET /api/v1/calendar", () => {
  it("fills days without editions and counts only visible ones today", async () => {
    const { body } = await get("/api/v1/calendar?days=7");
    expect(body.days).toHaveLength(7);
    expect(body.target).toEqual(expect.any(Number));
    expect(body.days.at(-1)).toMatchObject({
      date: body.today,
      published: 3,
      failedNotifications: 0,
    });
    expect(body.days[0]).toMatchObject({ published: 0 });
  });
});

describe("GET /api/v1/articles filters", () => {
  it("applies source before the limit", async () => {
    const { body } = await get(
      "/api/v1/articles?days=7&limit=2&source=Anthropic%20News",
    );
    expect(body.items).toHaveLength(2);
    expect(
      body.items.every(
        (i: { source: string }) => i.source === "Anthropic News",
      ),
    ).toBe(true);
  });

  it("scans the whole window for primary sources before trimming", async () => {
    const { body } = await get("/api/v1/articles?days=7&limit=2&primary=true");
    expect(body.items).toHaveLength(2);
  });
});
