use tauri::State;

use crate::commands::client_for;
use crate::error::AppError;
use crate::params::{opt_number, opt_text};
use crate::state::AppState;
use crate::types::{ArticlePage, CycleRun, Metrics, Page, Prompts, SourcePage};

#[tauri::command]
pub async fn articles(
    state: State<'_, AppState>,
    days: Option<i64>,
    limit: Option<i64>,
    source: Option<String>,
    primary: Option<bool>,
) -> Result<ArticlePage, AppError> {
    let query = [
        ("days", opt_number(days)),
        ("limit", opt_number(limit)),
        ("source", opt_text(source)),
        (
            "primary",
            if primary.unwrap_or(false) {
                "true".to_string()
            } else {
                String::new()
            },
        ),
    ];
    client_for(&state)?.get("/api/v1/articles", &query).await
}

#[tauri::command]
pub async fn sources(
    state: State<'_, AppState>,
    days: Option<i64>,
) -> Result<SourcePage, AppError> {
    let query = [("days", opt_number(days))];
    client_for(&state)?.get("/api/v1/sources", &query).await
}

#[tauri::command]
pub async fn cycles(
    state: State<'_, AppState>,
    limit: Option<i64>,
    kind: Option<String>,
    status: Option<String>,
) -> Result<Page<CycleRun>, AppError> {
    let query = [
        ("limit", opt_number(limit)),
        ("type", opt_text(kind)),
        ("status", opt_text(status)),
    ];
    client_for(&state)?.get("/api/v1/cycles", &query).await
}

#[tauri::command]
pub async fn prompts(state: State<'_, AppState>) -> Result<Prompts, AppError> {
    client_for(&state)?.get("/api/v1/prompts", &[]).await
}

#[tauri::command]
pub async fn metrics(
    state: State<'_, AppState>,
    name: Option<String>,
    hours: Option<i64>,
) -> Result<Metrics, AppError> {
    let query = [("name", opt_text(name)), ("hours", opt_number(hours))];
    client_for(&state)?.get("/api/v1/metrics", &query).await
}
