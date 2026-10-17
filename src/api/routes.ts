import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { evaluateHealth } from "../observability/health.js";
import { localDayIso } from "../utils/date.js";
import { ApiError, intParam } from "./http.js";
import {
  isExposableStateKey,
  mergeSources,
  parseJsonObject,
  toCrawledArticle,
  toCycleRun,
  toEdition,
  toEvidence,
  toPromptVersion,
  toStateEntry,
} from "./read-model.js";
import { RUNNABLE_MODES, type RunSpawner, planRun } from "./runs.js";

export interface RouteContext {
  params: Record<string, string>;
  url: URL;
  body: unknown;
}

export interface Route {
  method: "GET" | "POST";
  path: string;
  /** 202 when the handler only accepted the request. */
  successStatus?: number;
  handler: (ctx: RouteContext) => unknown | Promise<unknown>;
}

export interface RouteDeps {
  spawner: RunSpawner;
  startedAt: number;
}

const OVERVIEW_WINDOW_DAYS = 2;

function meta(deps: RouteDeps) {
  return {
    runMode: config.runMode,
    timezone: config.timezone,
    dailyEditions: config.dailyEditions,
    schedule: {
      crawlIntervalMinutes: config.crawlIntervalMinutes,
      articleCron: config.articleCron,
      radarCron: config.radarCron,
      modelAlertCron: config.modelAlertCron,
    },
    database: { path: config.dbPath },
    runsEnabled: config.api.allowRuns,
    runnableModes: RUNNABLE_MODES,
    startedAt: new Date(deps.startedAt).toISOString(),
    uptimeSeconds: Math.round((Date.now() - deps.startedAt) / 1000),
  };
}

function editionCounts() {
  const day = localDayIso();
  return { day, editionsToday: db.countPublishedOn("article", day) };
}

export function createRoutes(deps: RouteDeps): Route[] {
  return [
    {
      method: "GET",
      path: "/api/v1/health",
      handler: () => {
        const stats = db.getOperationalStats();
        return {
          ...evaluateHealth(stats),
          stats,
          checkedAt: new Date().toISOString(),
        };
      },
    },

    {
      method: "GET",
      path: "/api/v1/overview",
      handler: () => {
        const stats = db.getOperationalStats();
        const sourceViews = mergeSources(
          db.getSourceHealthAll(),
          db.getSourceTotals(OVERVIEW_WINDOW_DAYS),
        );
        const snapshot = db.getLatestIntelligenceSnapshot();
        return {
          health: evaluateHealth(stats),
          stats,
          ...editionCounts(),
          dailyEditionsTarget: config.dailyEditions,
          activeRun: deps.spawner.active(),
          runsEnabled: config.api.allowRuns,
          latestEditions: db.getPublishedRecent(5).map(toEdition),
          lastCycles: db.getCycleRuns(8).map(toCycleRun),
          sources: {
            total: sourceViews.length,
            failing: sourceViews.filter((s) => s.consecutiveFailures > 0)
              .length,
            primary: sourceViews.filter((s) => s.primary).length,
          },
          intelligence: snapshot
            ? {
                day: snapshot.day,
                capturedAt: snapshot.captured_at,
                topModel: snapshot.top_model,
                topScore: snapshot.top_score,
                models: snapshot.models.slice(0, 5),
              }
            : null,
        };
      },
    },

    {
      method: "GET",
      path: "/api/v1/meta",
      handler: () => meta(deps),
    },

    {
      method: "GET",
      path: "/api/v1/editions",
      handler: ({ url }) => {
        const items = db
          .getPublishedRecent(
            intParam(url, "limit", 50, 1, 200),
            optionalKind(url),
            optionalStatus(url),
          )
          .map(toEdition);
        return { total: items.length, items };
      },
    },

    {
      method: "GET",
      path: "/api/v1/editions/:slug",
      handler: ({ params }) => {
        const edition = db.getPublishedBySlug(params.slug);
        if (!edition) throw new ApiError(404, "edition not found");
        return {
          edition: toEdition(edition),
          evidence: db.getPublishedEvidence(edition.url).map(toEvidence),
        };
      },
    },

    {
      method: "GET",
      path: "/api/v1/articles",
      handler: ({ url }) => {
        const days = intParam(url, "days", 7, 1, 60);
        const limit = intParam(url, "limit", 100, 1, 500);
        const source = url.searchParams.get("source")?.trim();
        const primaryOnly = url.searchParams.get("primary") === "true";
        const items = db
          .getArticlesSince(days, limit)
          .map(toCrawledArticle)
          .filter((article) => !source || article.source === source)
          .filter((article) => !primaryOnly || article.primary);
        return { days, total: items.length, items };
      },
    },

    {
      method: "GET",
      path: "/api/v1/sources",
      handler: ({ url }) => {
        const days = intParam(url, "days", 7, 1, 60);
        return {
          days,
          items: mergeSources(
            db.getSourceHealthAll(),
            db.getSourceTotals(days),
          ),
        };
      },
    },

    {
      method: "GET",
      path: "/api/v1/cycles",
      handler: ({ url }) => {
        const items = db
          .getCycleRuns(intParam(url, "limit", 50, 1, 200), {
            type: url.searchParams.get("type")?.trim(),
            status: url.searchParams.get("status")?.trim(),
          })
          .map(toCycleRun);
        return { total: items.length, items };
      },
    },

    {
      method: "GET",
      path: "/api/v1/prompts",
      handler: () => {
        const prompt = db.getState("system_prompt");
        const entries = db.getStateEntries(500);
        const updatedAt =
          entries.find((entry) => entry.key === "system_prompt")?.updated_at ??
          null;
        return {
          active: prompt ? { prompt, chars: prompt.length, updatedAt } : null,
          items: db.getPromptVersions(50).map(toPromptVersion),
        };
      },
    },

    {
      method: "GET",
      path: "/api/v1/metrics",
      handler: ({ url }) => {
        const hours = intParam(url, "hours", 48, 1, 24 * 30);
        const name = url.searchParams.get("name")?.trim();
        const points = name
          ? db.getMetricPoints(name, hours, intParam(url, "limit", 120, 1, 500))
          : [];
        return {
          hours,
          summary: db.getMetricSummary(hours, name),
          points: points.map((point) => ({
            value: point.value,
            labels: parseJsonObject(point.labels_json),
            recordedAt: point.recorded_at,
          })),
        };
      },
    },

    {
      method: "GET",
      path: "/api/v1/state",
      handler: () => ({
        items: db
          .getStateEntries(500)
          .filter((entry) => isExposableStateKey(entry.key))
          .map(toStateEntry),
      }),
    },

    {
      method: "POST",
      path: "/api/v1/runs",
      successStatus: 202,
      handler: ({ body }) => {
        const plan = planRun({
          allowRuns: config.api.allowRuns,
          active: deps.spawner.active(),
          mode: (body as { mode?: unknown } | null)?.mode,
        });
        if (!plan.ok) throw new ApiError(plan.status, plan.error);
        return { accepted: true, run: deps.spawner.start(plan.mode) };
      },
    },
  ];
}

function optionalKind(url: URL) {
  const kind = url.searchParams.get("kind")?.trim();
  if (!kind) return undefined;
  if (kind !== "article" && kind !== "report") {
    throw new ApiError(400, "kind must be article or report");
  }
  return kind;
}

function optionalStatus(url: URL) {
  const status = url.searchParams.get("status")?.trim();
  if (!status) return undefined;
  const allowed = ["pending", "delivered", "dead_letter", "suppressed"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `status must be one of: ${allowed.join(", ")}`);
  }
  return status as "pending" | "delivered" | "dead_letter" | "suppressed";
}
