use tauri::State;

use crate::commands::client_for;
use crate::error::AppError;
use crate::params::require_mode;
use crate::state::AppState;
use crate::types::RunAccepted;

/// One-shot cycle in the agent, not in the console: the API answers 202 and the
/// run shows up in Ciclos like any scheduled one.
#[tauri::command]
pub async fn run_start(state: State<'_, AppState>, mode: String) -> Result<RunAccepted, AppError> {
    let mode = require_mode(&mode)?;
    client_for(&state)?
        .post("/api/v1/runs", serde_json::json!({ "mode": mode }))
        .await
}
