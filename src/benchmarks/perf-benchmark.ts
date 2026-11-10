import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { type CurationPolicy, curateArticles } from "../agent/curation.js";
import { type Route, createRoutes } from "../api/routes.js";
import { db, getDb } from "../knowledge/store.js";
import { mapLimit } from "../utils/concurrency.js";
import {
  type SeedScale,
  buildArticles,
  buildVectors,
  seedDatabase,
} from "./perf-seed.js";

export interface PerfResult {
  name: string;
  iterations: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  /** Digest of the returned value, so a faster run can prove it answers the same. */
  checksum?: string;
}

export interface PerfReport {
  node: string;
  scale: SeedScale;
  results: PerfResult[];
}

interface Case {
  name: string;
  iterations: number;
  run: (iteration: number) => unknown;
  /** Reduces the value to what must not change between two runs. */
  digest?: (value: unknown) => unknown;
}

function percentile(sorted: number[], fraction: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index];
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function measure(item: Case): PerfResult {
  // Warm-up outside the samples: the first call pays statement compilation and
  // JIT tiers that a long-lived process pays once.
  const warmup = Math.max(1, Math.min(5, Math.floor(item.iterations / 10)));
  let last: unknown;
  for (let i = 0; i < warmup; i++) last = item.run(-1 - i);

  const samples: number[] = [];
  for (let i = 0; i < item.iterations; i++) {
    const started = performance.now();
    last = item.run(i);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return {
    name: item.name,
    iterations: item.iterations,
    medianMs: round(percentile(samples, 0.5)),
    p95Ms: round(percentile(samples, 0.95)),
    minMs: round(samples[0]),
    checksum: item.digest
      ? createHash("sha256")
          .update(JSON.stringify(item.digest(last)))
          .digest("hex")
          .slice(0, 12)
      : undefined,
  };
}

function apiCase(
  routes: Route[],
  name: string,
  path: string,
  query: string,
  iterations: number,
  params: Record<string, string> = {},
): Case {
  const route = routes.find(
    (candidate) => candidate.method === "GET" && candidate.path === path,
  );
  if (!route) throw new Error(`benchmark route missing: ${path}`);
  const url = new URL(`http://bench.local${path}${query}`);
  return {
    name,
    iterations,
    // Serialized too: the response body is part of what a request costs.
    run: () => JSON.stringify(route.handler({ params, url, body: undefined })),
  };
}

/** The daily-edition policy `generateArticle` passes, minus the embeddings. */
const DAILY_POLICY: CurationPolicy = {
  perBucket: 3,
  perBucketOverrides: { reddit: 6 },
  max: 36,
  requirePrimary: true,
  minSummaryLength: 80,
  maxPrimaryShare: 0.5,
  minPrimarySources: 9,
  minCommunitySignals: 4,
  minRedditSignals: 3,
  requireFocusCommunities: true,
};

function curationDigest(value: unknown): unknown {
  const result = value as ReturnType<typeof curateArticles>;
  return {
    selected: result.selected.map((item) => [
      item.article.url,
      item.evidenceUrls,
    ]),
    rejected: result.rejected.map((item) => [item.article.url, item.reason]),
    metrics: result.metrics,
  };
}

function curationCases(scale: SeedScale): Case[] {
  // The pools `generateArticle` and the period reports really load: 500 + 300
  // primaries for a daily, 900 + 300 for a weekly, up to 2000 for a report.
  const sizes = scale.articles >= 10_000 ? [800, 1200, 2000] : [60];
  const semanticSizes = scale.articles >= 10_000 ? [800, 1200] : [60];
  const cases: Case[] = sizes.map((size) => {
    const articles = buildArticles(size);
    return {
      name: `curation.lexical (${size} articles)`,
      iterations: size >= 2000 ? 5 : 10,
      run: () => curateArticles(articles, DAILY_POLICY),
      digest: curationDigest,
    };
  });
  for (const size of semanticSizes) {
    const articles = buildArticles(size);
    const vectors = buildVectors(articles);
    const priorStories = [...vectors.values()]
      .slice(0, 36)
      .map((vector, index) => ({ title: `Prior story ${index}`, vector }));
    cases.push({
      name: `curation.semantic (${size} articles, 768-dim)`,
      iterations: 5,
      run: () =>
        curateArticles(articles, {
          ...DAILY_POLICY,
          vectors,
          priorStories,
          semanticThreshold: 0.88,
        }),
      digest: curationDigest,
    });
  }
  return cases;
}

function storeCases(scale: SeedScale): Case[] {
  const editionUrl = (
    getDb()
      .prepare("SELECT url FROM published_articles ORDER BY id DESC LIMIT 1")
      .get() as { url: string }
  ).url;
  const batch = scale.articles >= 10_000 ? 200 : 20;
  return [
    {
      name: "store.markNotification (by url)",
      iterations: 200,
      run: () => db.markNotification(editionUrl, "pending"),
    },
    {
      name: "store.getPendingNotifications",
      iterations: 200,
      run: () => db.getPendingNotifications(),
    },
    {
      name: "store.getOperationalStats",
      iterations: 100,
      run: () => db.getOperationalStats(),
    },
    {
      name: `store.crawl insert loop (${batch} x urlExists + saveArticle)`,
      iterations: 10,
      run: (iteration) => {
        for (let i = 0; i < batch; i++) {
          const url = `https://bench.test/new/${iteration}/${i}`;
          if (db.urlExists(url)) continue;
          db.saveArticle({
            title: `New article ${iteration}-${i}`,
            source: "Engineering Blog 1",
            url,
            summary: "A summary long enough to look like a real feed item.",
            tags: '["ai"]',
          });
        }
      },
    },
    {
      name: "store.startCycle + finishCycle (x100)",
      iterations: 10,
      run: () => {
        for (let i = 0; i < 100; i++) {
          db.finishCycle(db.startCycle("bench"), "succeeded", { saved: i });
        }
      },
    },
    {
      name: "store.recordMetric (x100)",
      iterations: 10,
      run: () => {
        for (let i = 0; i < 100; i++) {
          db.recordMetric("bench.metric", i, { type: "bench" });
        }
      },
    },
  ];
}

function apiCases(): Case[] {
  const routes = createRoutes({
    spawner: {
      active: () => null,
      start: () => {
        throw new Error("the benchmark never starts a run");
      },
    },
    startedAt: Date.now(),
  });
  const slug = (
    getDb()
      .prepare("SELECT slug FROM published_articles ORDER BY id DESC LIMIT 1")
      .get() as { slug: string }
  ).slug;
  return [
    apiCase(routes, "GET /overview", "/api/v1/overview", "", 100),
    apiCase(routes, "GET /health", "/api/v1/health", "", 100),
    apiCase(routes, "GET /cycles", "/api/v1/cycles", "?limit=50", 100),
    apiCase(
      routes,
      "GET /cycles?status=failed",
      "/api/v1/cycles",
      "?limit=50&status=failed",
      100,
    ),
    apiCase(routes, "GET /metrics (48 h)", "/api/v1/metrics", "?hours=48", 100),
    apiCase(
      routes,
      "GET /metrics?name= (48 h series)",
      "/api/v1/metrics",
      "?hours=48&name=llm.latency_ms",
      100,
    ),
    apiCase(
      routes,
      "GET /metrics?name= (720 h series)",
      "/api/v1/metrics",
      "?hours=720&name=llm.latency_ms",
      100,
    ),
    apiCase(routes, "GET /prompts", "/api/v1/prompts", "", 100),
    apiCase(routes, "GET /editions", "/api/v1/editions", "?limit=50", 100),
    apiCase(
      routes,
      "GET /editions?q=",
      "/api/v1/editions",
      "?limit=50&q=latency",
      30,
    ),
    apiCase(routes, "GET /editions/:slug", "/api/v1/editions/:slug", "", 200, {
      slug,
    }),
    apiCase(routes, "GET /calendar", "/api/v1/calendar", "?days=35", 100),
    apiCase(routes, "GET /sources", "/api/v1/sources", "?days=7", 50),
    apiCase(
      routes,
      "GET /articles",
      "/api/v1/articles",
      "?days=7&limit=100",
      100,
    ),
    apiCase(routes, "GET /state", "/api/v1/state", "", 100),
  ];
}

/**
 * Times the read paths the console polls, the store writes of a crawl and the
 * curation pass, against a database seeded by `seedDatabase`. No network.
 */
export function runPerfBenchmark(scale: SeedScale): PerfReport {
  seedDatabase(getDb(), scale);
  getDb().exec("ANALYZE");
  const cases = [...apiCases(), ...storeCases(scale), ...curationCases(scale)];
  return {
    node: process.version,
    scale,
    results: cases.map(measure),
  };
}

function ratio(before: number, after: number): string {
  if (after <= 0 || before <= 0) return "n/a";
  const factor = before / after;
  return factor >= 1
    ? `${factor.toFixed(factor >= 10 ? 0 : 1)}x faster`
    : `${(1 / factor).toFixed(1)}x slower`;
}

export function formatReport(
  report: PerfReport,
  baseline?: PerfReport,
): string {
  const lines: string[] = [];
  if (!baseline) {
    lines.push("| Case | Iterations | Median (ms) | p95 (ms) |");
    lines.push("|---|---:|---:|---:|");
    for (const result of report.results) {
      lines.push(
        `| ${result.name} | ${result.iterations} | ${result.medianMs} | ${result.p95Ms} |`,
      );
    }
    return lines.join("\n");
  }
  const before = new Map(baseline.results.map((item) => [item.name, item]));
  lines.push(
    "| Case | Before median (ms) | After median (ms) | Before p95 | After p95 | Change | Same output |",
  );
  lines.push("|---|---:|---:|---:|---:|---|---|");
  for (const result of report.results) {
    const previous = before.get(result.name);
    if (!previous) continue;
    const same =
      result.checksum && previous.checksum
        ? result.checksum === previous.checksum
          ? "yes"
          : "NO"
        : "—";
    lines.push(
      `| ${result.name} | ${previous.medianMs} | ${result.medianMs} | ${previous.p95Ms} | ${result.p95Ms} | ${ratio(previous.medianMs, result.medianMs)} | ${same} |`,
    );
  }
  return lines.join("\n");
}

export interface SchedulingResult {
  crawlers: number;
  latencyMs: number;
  sequentialMs: number;
  boundedMs: number;
  limit: number;
}

/**
 * The extra crawlers used to run one after the other; they now run three at a
 * time. This times the scheduler itself with stub crawlers that only wait, so
 * it shows the shape of the change, not a network measurement.
 */
export async function runSchedulingBenchmark(
  crawlers = 9,
  latencyMs = 40,
  limit = 3,
): Promise<SchedulingResult> {
  const stubs = Array.from({ length: crawlers }, (_, index) => index);
  const wait = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  const time = async (concurrency: number) => {
    const started = performance.now();
    await mapLimit(stubs, concurrency, wait);
    return round(performance.now() - started);
  };
  return {
    crawlers,
    latencyMs,
    sequentialMs: await time(1),
    boundedMs: await time(limit),
    limit,
  };
}
