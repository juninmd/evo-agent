import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isAuthorized } from "../api/auth.js";
import { ApiError, intParam, matchPath, stringParam } from "../api/http.js";
import {
  isExposableStateKey,
  mergeSources,
  parseSqliteUtc,
  toCrawledArticle,
  toCycleRun,
} from "../api/read-model.js";
import { type RunChild, createRunSpawner, planRun } from "../api/runs.js";
import { createApiServer } from "../api/server.js";
import { config } from "../config.js";
import { db, getDb } from "../knowledge/store.js";

const TOKEN = process.env.API_TOKEN ?? "";

function seed() {
  db.saveArticle({
    title: "Claude Code 2.0",
    source: "Anthropic News",
    url: "https://example.test/primary",
    summary: "resumo primário",
    tags: '["ai","claude"]',
    engagement_score: 42,
  });
  db.saveArticle({
    title: "Thread da comunidade",
    source: "Reddit: LocalLLaMA",
    url: "https://example.test/community",
    summary: "",
    tags: "not-json",
    engagement_score: 3,
  });

  db.savePublished({
    slug: "2026-10-17-edicao-1",
    title: "Edição 1",
    url: "https://pages.test/2026/10/17/edicao-1.html",
    date: "2026-10-17",
    summary: "resumo da edição",
    tags: ["ai"],
    kind: "article",
    editorialMetrics: {
      considered: 12,
      selected: 5,
      rejected: 7,
      buckets: { labs: 4 },
      primarySources: 3,
    },
    evidence: [
      {
        sourceUrl: "https://example.test/primary",
        sourceTitle: "Claude Code 2.0",
        excerpt: "trecho de evidência",
      },
    ],
  });

  const runId = db.startCycle("daily");
  db.finishCycle(runId, "succeeded", { published: 1 });
  db.recordMetric("editorial.quality_score", 88, { type: "daily" });

  db.savePromptVersion({
    prompt: "prompt ativo",
    score: 95,
    status: "promoted",
    reason: "candidate passed policy gate 95/95",
  });
  db.setState("system_prompt", "prompt ativo");
  db.setState("last_weekly_report_at", "2026-10-11T18:00:00.000Z");
  db.setSourceHealth("Reddit: LocalLLaMA", 3, 2);
}

async function get(path: string, token: string | null = TOKEN) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

let base = "";
let server: Server;

beforeAll(async () => {
  seed();
  server = createApiServer();
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  getDb().close();
});

describe("isAuthorized", () => {
  it("rejects an unconfigured token, so the API never serves anonymously", () => {
    expect(isAuthorized("Bearer anything", "")).toBe(false);
  });

  it("rejects a missing header, another scheme, and a wrong value", () => {
    expect(isAuthorized(undefined, "secret")).toBe(false);
    expect(isAuthorized("Basic secret", "secret")).toBe(false);
    expect(isAuthorized("Bearer secretx", "secret")).toBe(false);
    expect(isAuthorized("Bearer secre", "secret")).toBe(false);
  });

  it("accepts the exact bearer token", () => {
    expect(isAuthorized("Bearer secret", "secret")).toBe(true);
    expect(isAuthorized("Bearer  secret  ", "secret")).toBe(true);
  });
});

describe("http helpers", () => {
  it("captures path parameters and rejects a different shape", () => {
    expect(matchPath("/api/v1/editions/:slug", "/api/v1/editions/a-b")).toEqual(
      {
        slug: "a-b",
      },
    );
    expect(matchPath("/api/v1/editions", "/api/v1/editions/a/b")).toBeNull();
    expect(matchPath("/api/v1/editions", "/api/v1/cycles")).toBeNull();
  });

  it("bounds integer parameters instead of trusting the query string", () => {
    const url = new URL("http://x/?limit=5");
    expect(intParam(url, "limit", 50, 1, 200)).toBe(5);
    expect(intParam(url, "missing", 50, 1, 200)).toBe(50);
    expect(() =>
      intParam(new URL("http://x/?limit=5000"), "limit", 50, 1, 200),
    ).toThrow(ApiError);
    expect(() =>
      intParam(new URL("http://x/?limit=abc"), "limit", 50, 1, 200),
    ).toThrow(ApiError);
  });

  it("caps the length of a text parameter", () => {
    const long = new URL(`http://x/?q=${"a".repeat(300)}`);
    expect(() => stringParam(long, "q", { maxLength: 200 })).toThrow(ApiError);
    expect(stringParam(new URL("http://x/?q=ok"), "q")).toBe("ok");
  });
});

describe("read model", () => {
  it("reads a SQLite timestamp as UTC", () => {
    expect(parseSqliteUtc("2026-10-17 12:00:00")).toBe(
      Date.UTC(2026, 9, 17, 12, 0, 0),
    );
    expect(parseSqliteUtc(null)).toBeNull();
    expect(parseSqliteUtc("not a date")).toBeNull();
  });

  it("computes the duration of a finished cycle and none while it runs", () => {
    expect(
      toCycleRun({
        id: 1,
        type: "daily",
        status: "succeeded",
        metrics_json: '{"published":1}',
        error: null,
        started_at: "2026-10-17 12:00:00",
        finished_at: "2026-10-17 12:01:30",
      }),
    ).toMatchObject({ durationSeconds: 90, metrics: { published: 1 } });

    expect(
      toCycleRun({
        id: 2,
        type: "daily",
        status: "running",
        metrics_json: "{}",
        error: null,
        started_at: "2026-10-17 12:00:00",
        finished_at: null,
      }).durationSeconds,
    ).toBeNull();
  });

  it("parses article tags defensively and flags a primary source", () => {
    const primary = toCrawledArticle({
      id: 1,
      title: "t",
      source: "Anthropic News",
      url: "https://example.test/a",
      summary: "s",
      tags: '["ai"]',
      engagement_score: 10,
      crawled_at: "2026-10-17 12:00:00",
    });
    expect(primary).toMatchObject({ primary: true, tags: ["ai"] });

    const community = toCrawledArticle({
      id: 2,
      title: "t",
      source: "Reddit: LocalLLaMA",
      url: "https://example.test/b",
      summary: "s",
      tags: "not-json",
      engagement_score: 1,
      crawled_at: "2026-10-17 12:00:00",
    });
    expect(community).toMatchObject({ primary: false, tags: [] });
  });

  // agent_state also holds system_prompt; the console must never publish it.
  it("only exposes bookkeeping state keys", () => {
    expect(isExposableStateKey("last_weekly_report_at")).toBe(true);
    expect(isExposableStateKey("system_prompt")).toBe(false);
  });

  it("keeps a source that only exists in source_health, sorted by failures", () => {
    const merged = mergeSources(
      [
        {
          source: "Broken Feed",
          consecutive_failures: 4,
          skip_remaining: 1,
          updated_at: "2026-10-17 12:00:00",
        },
      ],
      [
        {
          source: "Anthropic News",
          total: 9,
          last_seen: "2026-10-17 12:00:00",
        },
      ],
    );
    expect(merged.map((item) => item.source)).toEqual([
      "Broken Feed",
      "Anthropic News",
    ]);
    expect(merged[0]).toMatchObject({ recentArticles: 0, lastSeenAt: null });
    expect(merged[1]).toMatchObject({ primary: true, recentArticles: 9 });
  });
});

describe("planRun", () => {
  it("refuses everything while run triggering is disabled", () => {
    expect(planRun({ allowRuns: false, active: null, mode: "DAILY" })).toEqual({
      ok: false,
      status: 501,
      error: expect.stringContaining("API_ALLOW_RUNS"),
    });
  });

  it("refuses a second run while one is in flight", () => {
    const plan = planRun({
      allowRuns: true,
      active: {
        mode: "CRAWL",
        pid: 1,
        startedAt: "2026-10-17T12:00:00.000Z",
      },
      mode: "DAILY",
    });
    expect(plan).toMatchObject({ ok: false, status: 409 });
  });

  it("accepts a known mode, normalized to upper case", () => {
    expect(planRun({ allowRuns: true, active: null, mode: " daily " })).toEqual(
      {
        ok: true,
        mode: "DAILY",
      },
    );
    expect(
      planRun({ allowRuns: true, active: null, mode: "DAEMON" }),
    ).toMatchObject({ ok: false, status: 400 });
    expect(planRun({ allowRuns: true, active: null, mode: 42 })).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});

describe("run spawner", () => {
  function fakeChild(onExit: (code: number) => void): RunChild {
    return {
      pid: 4242,
      stdout: { on: () => undefined },
      stderr: { on: () => undefined },
      on: (event: string, listener: (value: never) => void) => {
        if (event === "exit") setTimeout(() => listener(0 as never), 0);
        if (event === "error") void onExit;
        return undefined;
      },
    };
  }

  it("marks a run active while its child lives and clears it on exit", async () => {
    const spawner = createRunSpawner({
      execPath: "node",
      entry: "dist/index.js",
      spawnChild: () => fakeChild(() => undefined),
    });

    expect(spawner.active()).toBeNull();
    const handle = spawner.start("CRAWL");
    expect(handle).toMatchObject({ mode: "CRAWL", pid: 4242 });
    expect(spawner.active()).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(spawner.active()).toBeNull();
  });
});

describe("api server", () => {
  it("answers the readiness probe without a token", async () => {
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
  });

  it("refuses every data route without a valid bearer token", async () => {
    expect((await get("/api/v1/health", null)).status).toBe(401);
    expect((await get("/api/v1/health", "wrong")).status).toBe(401);
    expect(
      (await fetch(`${base}/api/v1/overview`)).headers.get("content-type"),
    ).toContain("application/json");
  });

  it("reports 404 for unknown routes and 413 for an oversized body", async () => {
    expect((await get("/api/v1/nope")).status).toBe(404);

    const response = await fetch(`${base}/api/v1/runs`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: "x".repeat(70_000),
    });
    expect(response.status).toBe(413);
  });

  it("serves the health contract", async () => {
    const { status, body } = await get("/api/v1/health");
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: expect.any(String) });
    expect(body.stats).toMatchObject({ recentArticles: 2 });
  });

  it("serves the overview with today's edition budget", async () => {
    const { body } = await get("/api/v1/overview");
    expect(body).toMatchObject({
      dailyEditionsTarget: config.dailyEditions,
      runsEnabled: false,
      activeRun: null,
      sources: { total: 2, failing: 1 },
    });
    expect(body.lastCycles[0]).toMatchObject({ type: "daily" });
    expect(body.latestEditions[0]).toMatchObject({
      slug: "2026-10-17-edicao-1",
    });
    expect(body.intelligence).toBeNull();
    // O veredito aninhado e so o veredito: os contadores ja viajam em `stats`,
    // e duas copias poderiam divergir.
    expect(Object.keys(body.health).sort()).toEqual(["reasons", "status"]);
    expect(body.stats).toMatchObject({ recentArticles: 2 });
  });

  it("lists editions and returns evidence for one of them", async () => {
    const list = await get("/api/v1/editions?kind=article&limit=10");
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      notificationStatus: "pending",
      editorialMetrics: { selected: 5, primarySources: 3 },
    });

    const detail = await get("/api/v1/editions/2026-10-17-edicao-1");
    expect(detail.status).toBe(200);
    expect(detail.body.evidence[0]).toMatchObject({
      sourceTitle: "Claude Code 2.0",
      sourceUrl: "https://example.test/primary",
    });

    expect((await get("/api/v1/editions/missing")).status).toBe(404);
    expect((await get("/api/v1/editions?kind=other")).status).toBe(400);
  });

  it("flags primary sources on the crawled-article feed", async () => {
    const all = await get("/api/v1/articles?days=7");
    expect(all.body.items).toHaveLength(2);

    const primary = await get("/api/v1/articles?days=7&primary=true");
    expect(
      primary.body.items.map((item: { source: string }) => item.source),
    ).toEqual(["Anthropic News"]);
  });

  it("merges crawl volume with source health", async () => {
    const { body } = await get("/api/v1/sources?days=7");
    const reddit = body.items.find(
      (item: { source: string }) => item.source === "Reddit: LocalLLaMA",
    );
    expect(reddit).toMatchObject({ consecutiveFailures: 3, recentArticles: 1 });
  });

  it("serves cycles, prompts, metrics and state", async () => {
    expect((await get("/api/v1/cycles")).body.items[0]).toMatchObject({
      status: "succeeded",
    });
    expect(
      (await get("/api/v1/cycles?status=skipped")).body.items,
    ).toHaveLength(0);

    const prompts = await get("/api/v1/prompts");
    expect(prompts.body.active).toMatchObject({ prompt: "prompt ativo" });
    expect(prompts.body.items[0]).toMatchObject({
      status: "promoted",
      promptChars: 12,
    });

    const metrics = await get("/api/v1/metrics?name=editorial.quality_score");
    expect(metrics.body.summary[0]).toMatchObject({
      name: "editorial.quality_score",
      samples: 1,
      // Camel case tambem nos aliases SQL: o console espelha estas chaves.
      lastRecorded: expect.any(String),
    });
    expect(metrics.body.points[0]).toMatchObject({ value: 88 });

    const state = await get("/api/v1/state");
    const keys = state.body.items.map((item: { key: string }) => item.key);
    expect(keys).toContain("last_weekly_report_at");
    expect(keys).not.toContain("system_prompt");
  });

  it("serves the schedule metadata", async () => {
    const { body } = await get("/api/v1/meta");
    expect(body).toMatchObject({
      runMode: config.runMode,
      timezone: config.timezone,
      runsEnabled: false,
      database: { path: config.dbPath },
    });
    expect(body.runnableModes).not.toContain("DAEMON");
    expect(body.runnableModes).not.toContain("API");
  });

  it("keeps run triggering disabled unless the deployment opts in", async () => {
    const response = await fetch(`${base}/api/v1/runs`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: "DAILY" }),
    });
    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("API_ALLOW_RUNS"),
    });
  });
});
