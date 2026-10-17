use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{io_error, AppError};

pub const DEFAULT_BASE_URL: &str = "http://127.0.0.1:8787";
pub const BASE_URL_ENV: &str = "EVO_AGENT_API_URL";
const FILE: &str = "settings.json";

/// What the webview is allowed to know: the token never crosses the IPC.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsView {
    pub base_url: String,
    pub has_token: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub base_url: String,
    #[serde(default)]
    pub token: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            // A launcher or a shell profile can point the first run at the
            // cluster without the user typing the URL.
            base_url: default_base_url(),
            token: String::new(),
        }
    }
}

pub fn default_base_url() -> String {
    pick_default_base_url(std::env::var(BASE_URL_ENV).ok())
}

/// Split from the environment read so the precedence is testable without
/// mutating process-wide state in a parallel test run.
pub fn pick_default_base_url(configured: Option<String>) -> String {
    configured
        .and_then(|raw| normalize_base_url(&raw).ok())
        .unwrap_or_else(|| DEFAULT_BASE_URL.to_string())
}

/// Only http/https survive. The value is handed to reqwest, where `file://`
/// would turn a typo into a local-file read.
pub fn normalize_base_url(raw: &str) -> Result<String, AppError> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err(AppError::Config(
            "informe a URL da API do agente".to_string(),
        ));
    }
    let parsed = reqwest::Url::parse(trimmed)
        .map_err(|_| AppError::Config(format!("URL inválida: {trimmed}")))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(AppError::Config(
            "a URL da API precisa começar com http:// ou https://".to_string(),
        ));
    }
    Ok(trimmed.to_string())
}

impl Settings {
    pub fn path(dir: &Path) -> PathBuf {
        dir.join(FILE)
    }

    pub fn load(dir: &Path) -> Self {
        let Ok(raw) = fs::read_to_string(Self::path(dir)) else {
            return Self::default();
        };
        // A hand-edited file that no longer parses must not brick the app.
        let parsed: Settings = serde_json::from_str(&raw).unwrap_or_default();
        let base_url =
            normalize_base_url(&parsed.base_url).unwrap_or_else(|_| Settings::default().base_url);
        Self {
            base_url,
            token: parsed.token,
        }
    }

    pub fn save(&self, dir: &Path) -> Result<(), AppError> {
        fs::create_dir_all(dir).map_err(io_error)?;
        let body = serde_json::to_string_pretty(self)
            .map_err(|error| AppError::Config(error.to_string()))?;
        fs::write(Self::path(dir), body).map_err(io_error)
    }

    pub fn view(&self) -> SettingsView {
        SettingsView {
            base_url: self.base_url.clone(),
            has_token: !self.token.is_empty(),
        }
    }
}

#[path = "settings_tests.rs"]
#[cfg(test)]
mod tests;
