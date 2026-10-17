/** Espelho de `src/api/read-model.ts` no agente. */
export type HealthStatus = "healthy" | "degraded" | "critical";

export type Stats = {
  pendingNotifications: number;
  stalePendingNotifications: number;
  deadLetterNotifications: number;
  failedCycles24h: number;
  staleRunningCycles: number;
  successfulCycles24h: number;
  recentArticles: number;
  recentPrimarySources: number;
};

export type Health = {
  status: HealthStatus;
  reasons: string[];
  stats: Stats;
  checkedAt: string;
};

/** A visão geral aninha só o veredito: os contadores viajam em `stats`. */
export type HealthSummary = {
  status: HealthStatus;
  reasons: string[];
};

export type RunHandle = { mode: string; pid: number | null; startedAt: string };

export type Edition = {
  slug: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  kind: "article" | "report";
  period: string | null;
  notificationStatus: "pending" | "delivered" | "dead_letter" | "suppressed";
  notificationAttempts: number;
  notificationError: string | null;
  editorialMetrics: Record<string, unknown>;
  publishedAt: string;
};

export type CrawledArticle = {
  id: number;
  title: string;
  source: string;
  url: string;
  summary: string;
  tags: string[];
  engagementScore: number;
  crawledAt: string;
  primary: boolean;
};

export type CycleRun = {
  id: number;
  type: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  metrics: Record<string, unknown>;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
};

export type PromptVersion = {
  id: number;
  score: number;
  status: "promoted" | "rejected" | "rolled_back";
  reason: string;
  createdAt: string;
  promptChars: number;
};

export type Prompts = {
  active: { prompt: string; chars: number; updatedAt: string | null } | null;
  items: PromptVersion[];
};

export type SourceView = {
  source: string;
  primary: boolean;
  recentArticles: number;
  lastSeenAt: string | null;
  consecutiveFailures: number;
  skipRemaining: number;
  healthUpdatedAt: string | null;
};

export type MetricSummary = {
  name: string;
  samples: number;
  average: number;
  minimum: number;
  maximum: number;
  lastRecorded: string;
};

export type MetricPoint = {
  value: number;
  labels: Record<string, unknown>;
  recordedAt: string;
};

export type Metrics = {
  hours: number;
  summary: MetricSummary[];
  points: MetricPoint[];
};

export type Evidence = {
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
  observedAt: string;
};

export type EditionDetail = { edition: Edition; evidence: Evidence[] };

export type Page<T> = { total: number; items: T[] };
export type ArticlePage = {
  days: number;
  total: number;
  items: CrawledArticle[];
};
export type SourcePage = { days: number; items: SourceView[] };

export type Intelligence = {
  day: string;
  capturedAt: string;
  topModel: string;
  topScore: number;
  models: unknown[];
};

export type Overview = {
  health: HealthSummary;
  stats: Stats;
  day: string;
  editionsToday: number;
  dailyEditionsTarget: number;
  activeRun: RunHandle | null;
  runsEnabled: boolean;
  latestEditions: Edition[];
  lastCycles: CycleRun[];
  sources: { total: number; failing: number; primary: number };
  intelligence: Intelligence | null;
};

export type Meta = {
  runMode: string;
  timezone: string;
  dailyEditions: number;
  schedule: {
    crawlIntervalMinutes: number;
    articleCron: string;
    radarCron: string;
    modelAlertCron: string;
  };
  database: { path: string };
  runsEnabled: boolean;
  runnableModes: string[];
  startedAt: string;
  uptimeSeconds: number;
};

export type RunAccepted = { accepted: boolean; run: RunHandle };

/** O token nunca atravessa o IPC: a view so informa se existe. */
export type SettingsView = { baseUrl: string; hasToken: boolean };
