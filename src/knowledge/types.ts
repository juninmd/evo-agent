/**
 * Row and input shapes of the knowledge base. Column names stay snake_case
 * here: the API translates them to camelCase in `src/api/read-model.ts`.
 */
export interface Article {
  id: number;
  title: string;
  source: string;
  url: string;
  summary: string;
  tags: string;
  engagement_score: number;
  crawled_at: string;
}

export interface Snippet {
  id: number;
  title: string;
  language: string;
  code: string;
  explanation: string;
  source_url: string;
  created_at: string;
}

export interface AgentState {
  key: string;
  value: string;
  updated_at: string;
}

export interface SourceHealth {
  source: string;
  consecutive_failures: number;
  skip_remaining: number;
  updated_at: string;
}

export interface PublishedArticle {
  id: number;
  slug: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  kind: "article" | "report";
  period: string | null;
  notification_status: "pending" | "delivered" | "dead_letter" | "suppressed";
  notification_attempts: number;
  next_notification_at: string;
  notification_error: string | null;
  editorial_metrics: Record<string, unknown>;
  status: EditionStatus;
  quality_score: number | null;
  revision: number;
  published_at: string;
}

/** Lifecycle of the published page, independent of the Telegram outbox. */
export type EditionStatus = "published" | "corrected" | "retracted";

export interface PromptVersion {
  id: number;
  prompt: string;
  score: number;
  status: "promoted" | "rejected" | "rolled_back";
  reason: string;
  created_at: string;
}

export interface PublishedEvidence {
  article_url: string;
  source_url: string;
  source_title: string;
  excerpt: string;
  observed_at: string;
}

export interface CycleRun {
  id: number;
  type: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  metrics_json: string;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface MetricEvent {
  id: number;
  name: string;
  value: number;
  labels_json: string;
  recorded_at: string;
}

export interface MetricSummary {
  name: string;
  samples: number;
  average: number;
  minimum: number;
  maximum: number;
  last_recorded: string;
}

export interface SourceTotal {
  source: string;
  total: number;
  last_seen: string;
}

export interface SaveArticleInput {
  title: string;
  source: string;
  url: string;
  summary: string;
  tags: string;
  engagement_score?: number;
}

export interface SavePublishedInput {
  slug: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  kind: "article" | "report";
  period?: string;
  editorialMetrics?: object;
  evidence?: Array<{
    sourceUrl: string;
    sourceTitle: string;
    excerpt: string;
  }>;
  notificationStatus?: PublishedArticle["notification_status"];
  qualityScore?: number | null;
  /** Full Markdown as committed; enables revisions, diffs and preview. */
  content?: string;
  revisionReason?: string;
}

export interface IntelligenceModelRecord {
  name: string;
  slug: string;
  creator: string;
  intelligenceIndex: number;
  isOpenWeights: boolean;
  isReasoning: boolean;
  releaseDate?: string;
  contextWindowTokens?: number;
  rank: number;
}

export interface IntelligenceSnapshotRow {
  id: number;
  captured_at: string;
  day: string;
  source_url: string;
  models_json: string;
  top_model: string;
  top_score: number;
  changes_json: string;
}

export interface IntelligenceSnapshot {
  id: number;
  captured_at: string;
  day: string;
  source_url: string;
  models: IntelligenceModelRecord[];
  top_model: string;
  top_score: number;
  changes: Record<string, unknown>;
}

export interface SaveIntelligenceSnapshotInput {
  day: string;
  source_url?: string;
  models: IntelligenceModelRecord[];
  changes?: Record<string, unknown>;
}
