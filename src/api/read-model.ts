import { isPrimarySourceName } from "../agent/curation.js";
import type {
  AgentState,
  Article,
  CycleRun,
  PromptVersion,
  PublishedArticle,
  PublishedEvidence,
  SourceHealth,
  SourceTotal,
} from "../knowledge/store.js";

export interface EditionDto {
  slug: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  kind: PublishedArticle["kind"];
  period: string | null;
  notificationStatus: PublishedArticle["notification_status"];
  notificationAttempts: number;
  notificationError: string | null;
  editorialMetrics: Record<string, unknown>;
  publishedAt: string;
}

export interface CrawledArticleDto {
  id: number;
  title: string;
  source: string;
  url: string;
  summary: string;
  tags: string[];
  engagementScore: number;
  crawledAt: string;
  primary: boolean;
}

export interface CycleRunDto {
  id: number;
  type: string;
  status: CycleRun["status"];
  metrics: Record<string, unknown>;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  /** Null while the run is still open. */
  durationSeconds: number | null;
}

export interface PromptVersionDto {
  id: number;
  score: number;
  status: PromptVersion["status"];
  reason: string;
  createdAt: string;
  promptChars: number;
}

export interface SourceViewDto {
  source: string;
  primary: boolean;
  recentArticles: number;
  lastSeenAt: string | null;
  consecutiveFailures: number;
  skipRemaining: number;
  healthUpdatedAt: string | null;
}

/** Every payload is camelCase: the client mirrors these keys as struct fields. */
export interface EvidenceDto {
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
  observedAt: string;
}

export interface StateEntryDto {
  key: string;
  value: string;
  updatedAt: string;
}

/** SQLite timestamps are UTC without a zone marker; `Date.parse` needs one. */
export function parseSqliteUtc(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function safeJsonStrings(value: string | string[]): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function toEdition(row: PublishedArticle): EditionDto {
  return {
    slug: row.slug,
    title: row.title,
    url: row.url,
    date: row.date,
    summary: row.summary,
    tags: row.tags,
    kind: row.kind,
    period: row.period,
    notificationStatus: row.notification_status,
    notificationAttempts: row.notification_attempts,
    notificationError: row.notification_error,
    editorialMetrics: row.editorial_metrics,
    publishedAt: row.published_at,
  };
}

export function toCrawledArticle(row: Article): CrawledArticleDto {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    url: row.url,
    summary: row.summary ?? "",
    tags: safeJsonStrings(row.tags),
    engagementScore: row.engagement_score ?? 0,
    crawledAt: row.crawled_at,
    primary: isPrimarySourceName(row.source),
  };
}

export function toCycleRun(row: CycleRun): CycleRunDto {
  const started = parseSqliteUtc(row.started_at);
  const finished = parseSqliteUtc(row.finished_at);
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    metrics: parseJsonObject(row.metrics_json),
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds:
      started !== null && finished !== null
        ? Math.max(0, Math.round((finished - started) / 1000))
        : null,
  };
}

/** The prompt text itself is large and only rendered in the Prompts tab. */
export function toPromptVersion(row: PromptVersion): PromptVersionDto {
  return {
    id: row.id,
    score: row.score,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    promptChars: row.prompt.length,
  };
}

export function toEvidence(row: PublishedEvidence): EvidenceDto {
  return {
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    excerpt: row.excerpt,
    observedAt: row.observed_at,
  };
}

export function toStateEntry(row: AgentState): StateEntryDto {
  return { key: row.key, value: row.value, updatedAt: row.updated_at };
}

/**
 * `agent_state` also carries `system_prompt`; the console only publishes the
 * bookkeeping keys, so a future secret stored there never reaches the client.
 */
export function isExposableStateKey(key: string): boolean {
  return key.startsWith("last_");
}

export function mergeSources(
  health: SourceHealth[],
  totals: SourceTotal[],
): SourceViewDto[] {
  const bySource = new Map<string, SourceViewDto>();

  for (const row of totals) {
    bySource.set(row.source, {
      source: row.source,
      primary: isPrimarySourceName(row.source),
      recentArticles: row.total,
      lastSeenAt: row.last_seen,
      consecutiveFailures: 0,
      skipRemaining: 0,
      healthUpdatedAt: null,
    });
  }

  for (const row of health) {
    const existing = bySource.get(row.source);
    if (existing) {
      existing.consecutiveFailures = row.consecutive_failures;
      existing.skipRemaining = row.skip_remaining;
      existing.healthUpdatedAt = row.updated_at;
      continue;
    }
    // A source that only exists in source_health has been failing since before
    // the recency window: that is exactly the row worth showing.
    bySource.set(row.source, {
      source: row.source,
      primary: isPrimarySourceName(row.source),
      recentArticles: 0,
      lastSeenAt: null,
      consecutiveFailures: row.consecutive_failures,
      skipRemaining: row.skip_remaining,
      healthUpdatedAt: row.updated_at,
    });
  }

  return [...bySource.values()].sort(
    (a, b) =>
      b.consecutiveFailures - a.consecutiveFailures ||
      b.recentArticles - a.recentArticles ||
      a.source.localeCompare(b.source),
  );
}
