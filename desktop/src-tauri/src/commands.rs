use tauri::{State, Window};

use crate::client::ApiClient;
use crate::error::AppError;
use crate::params::{opt_number, opt_text, require_slug};
use crate::settings::{normalize_base_url, SettingsView};
use crate::state::AppState;
use crate::types::{Edition, EditionDetail, Health, Meta, Overview, Page};

/// Shared by every command module: the client is built from the current
/// settings on each call, so a saved change applies to the next request.
pub(crate) fn client_for(state: &AppState) -> Result<ApiClient, AppError> {
    ApiClient::new(&state.settings(), state.http.clone())
}

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> SettingsView {
    state.settings().view()
}

#[tauri::command]
pub async fn settings_save(
    state: State<'_, AppState>,
    base_url: String,
    token: Option<String>,
) -> Result<SettingsView, AppError> {
    let normalized = normalize_base_url(&base_url)?;
    Ok(state.update_settings(normalized, token)?.view())
}

/// Proves the URL and the token in one call: `/api/v1/meta` is authenticated.
#[tauri::command]
pub async fn settings_test(state: State<'_, AppState>) -> Result<Meta, AppError> {
    client_for(&state)?.get("/api/v1/meta", &[]).await
}

#[tauri::command]
pub async fn overview(state: State<'_, AppState>) -> Result<Overview, AppError> {
    client_for(&state)?.get("/api/v1/overview", &[]).await
}

#[tauri::command]
pub async fn health(state: State<'_, AppState>) -> Result<Health, AppError> {
    client_for(&state)?.get("/api/v1/health", &[]).await
}

#[tauri::command]
pub async fn meta(state: State<'_, AppState>) -> Result<Meta, AppError> {
    client_for(&state)?.get("/api/v1/meta", &[]).await
}

#[tauri::command]
pub async fn editions(
    state: State<'_, AppState>,
    limit: Option<i64>,
    kind: Option<String>,
    status: Option<String>,
) -> Result<Page<Edition>, AppError> {
    let query = [
        ("limit", opt_number(limit)),
        ("kind", opt_text(kind)),
        ("status", opt_text(status)),
    ];
    client_for(&state)?.get("/api/v1/editions", &query).await
}

#[tauri::command]
pub async fn edition_detail(
    state: State<'_, AppState>,
    slug: String,
) -> Result<EditionDetail, AppError> {
    let path = format!("/api/v1/editions/{}", require_slug(&slug)?);
    client_for(&state)?.get(&path, &[]).await
}

/// Links opened from the console must be pages the agent published, never a
/// local path or a custom scheme.
#[tauri::command]
pub async fn open_external(window: Window, url: String) -> Result<(), AppError> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return Err(AppError::Config("link não suportado".to_string()));
    }
    // Closing an external page is handled by the OS; the console keeps focus.
    let _ = window.set_focus();
    tauri_plugin_opener::open_url(trimmed, None::<&str>)
        .map_err(|error| AppError::Link(error.to_string()))
}
