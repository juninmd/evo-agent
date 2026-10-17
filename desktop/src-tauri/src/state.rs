use std::path::PathBuf;
use std::sync::RwLock;

use reqwest::Client;

use crate::client::build_http_client;
use crate::error::AppError;
use crate::settings::Settings;

pub struct AppState {
    pub dir: PathBuf,
    pub http: Client,
    settings: RwLock<Settings>,
}

impl AppState {
    pub fn new(dir: PathBuf) -> Result<Self, AppError> {
        Ok(Self {
            settings: RwLock::new(Settings::load(&dir)),
            http: build_http_client()?,
            dir,
        })
    }

    /// A clone, never a guard: an async command must not hold the lock across
    /// an await.
    pub fn settings(&self) -> Settings {
        self.settings
            .read()
            .map(|guard| guard.clone())
            .unwrap_or_default()
    }

    /// `token: None` keeps the stored secret, `Some("")` clears it, so the form
    /// never has to send the token back just to change the URL.
    pub fn update_settings(
        &self,
        base_url: String,
        token: Option<String>,
    ) -> Result<Settings, AppError> {
        let mut guard = self
            .settings
            .write()
            .map_err(|_| AppError::Config("estado da configuração indisponível".to_string()))?;
        guard.base_url = base_url;
        if let Some(value) = token {
            guard.token = value.trim().to_string();
        }
        let snapshot = guard.clone();
        snapshot.save(&self.dir)?;
        Ok(snapshot)
    }
}
