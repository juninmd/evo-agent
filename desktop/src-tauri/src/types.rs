use serde::{Deserialize, Serialize};

/// Mirror of `src/api/read-model.ts`. Every payload is camelCase, so each field
/// name here is part of the contract: renaming one silently breaks the console.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub pending_notifications: i64,
    pub stale_pending_notifications: i64,
    pub dead_letter_notifications: i64,
    #[serde(rename = "failedCycles24h")]
    pub failed_cycles_24h: i64,
    pub stale_running_cycles: i64,
    #[serde(rename = "successfulCycles24h")]
    pub successful_cycles_24h: i64,
    pub recent_articles: i64,
    pub recent_primary_sources: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub status: String,
    pub reasons: Vec<String>,
    pub stats: Stats,
    pub checked_at: String,
}

/// The overview nests only the verdict: the counters already travel in
/// `overview.stats`, and repeating them would let the two copies diverge.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthSummary {
    pub status: String,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunHandle {
    pub mode: String,
    pub pid: Option<u32>,
    pub started_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Edition {
    pub slug: String,
    pub title: String,
    pub url: String,
    pub date: String,
    pub summary: String,
    pub tags: Vec<String>,
    pub kind: String,
    pub period: Option<String>,
    pub notification_status: String,
    pub notification_attempts: i64,
    pub notification_error: Option<String>,
    pub editorial_metrics: serde_json::Value,
    pub published_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawledArticle {
    pub id: i64,
    pub title: String,
    pub source: String,
    pub url: String,
    pub summary: String,
    pub tags: Vec<String>,
    pub engagement_score: i64,
    pub crawled_at: String,
    pub primary: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CycleRun {
    pub id: i64,
    /// `type` in the payload; renamed because it is a Rust keyword.
    #[serde(rename = "type")]
    pub kind: String,
    pub status: String,
    pub metrics: serde_json::Value,
    pub error: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub duration_seconds: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivePrompt {
    pub prompt: String,
    pub chars: i64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptVersion {
    pub id: i64,
    pub score: i64,
    pub status: String,
    pub reason: String,
    pub created_at: String,
    pub prompt_chars: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Prompts {
    pub active: Option<ActivePrompt>,
    pub items: Vec<PromptVersion>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceView {
    pub source: String,
    pub primary: bool,
    pub recent_articles: i64,
    pub last_seen_at: Option<String>,
    pub consecutive_failures: i64,
    pub skip_remaining: i64,
    pub health_updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricSummary {
    pub name: String,
    pub samples: i64,
    pub average: f64,
    pub minimum: f64,
    pub maximum: f64,
    pub last_recorded: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricPoint {
    pub value: f64,
    pub labels: serde_json::Value,
    pub recorded_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    pub hours: i64,
    pub summary: Vec<MetricSummary>,
    pub points: Vec<MetricPoint>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Evidence {
    pub source_url: String,
    pub source_title: String,
    pub excerpt: String,
    pub observed_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditionDetail {
    pub edition: Edition,
    pub evidence: Vec<Evidence>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub total: i64,
    pub items: Vec<T>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticlePage {
    pub days: i64,
    pub total: i64,
    pub items: Vec<CrawledArticle>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourcePage {
    pub days: i64,
    pub items: Vec<SourceView>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceSummary {
    pub total: i64,
    pub failing: i64,
    pub primary: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Intelligence {
    pub day: String,
    pub captured_at: String,
    pub top_model: String,
    pub top_score: f64,
    pub models: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub health: HealthSummary,
    pub stats: Stats,
    pub day: String,
    pub editions_today: i64,
    pub daily_editions_target: i64,
    pub active_run: Option<RunHandle>,
    pub runs_enabled: bool,
    pub latest_editions: Vec<Edition>,
    pub last_cycles: Vec<CycleRun>,
    pub sources: SourceSummary,
    pub intelligence: Option<Intelligence>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub crawl_interval_minutes: i64,
    pub article_cron: String,
    pub radar_cron: String,
    pub model_alert_cron: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Meta {
    pub run_mode: String,
    pub timezone: String,
    pub daily_editions: i64,
    pub schedule: Schedule,
    pub database: DatabaseInfo,
    pub runs_enabled: bool,
    pub runnable_modes: Vec<String>,
    pub started_at: String,
    pub uptime_seconds: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunAccepted {
    pub accepted: bool,
    pub run: RunHandle,
}
