use std::time::Duration;

use reqwest::{Client, Method, Url};
use serde::de::DeserializeOwned;

use crate::error::AppError;
use crate::settings::{normalize_base_url, Settings};

const TIMEOUT: Duration = Duration::from_secs(30);

pub fn build_http_client() -> Result<Client, AppError> {
    // Idempotent: installs ring for the process, later calls are no-ops.
    let _ = rustls::crypto::ring::default_provider().install_default();
    Client::builder()
        .user_agent("evo-agent-console")
        .timeout(TIMEOUT)
        .build()
        .map_err(|error| AppError::Config(error.to_string()))
}

pub struct ApiClient {
    base: Url,
    token: String,
    http: Client,
}

/// Turns a raw response into a typed value or a pt-BR error. Split from the
/// transport so every status branch is unit-testable without a server.
pub fn interpret<T: DeserializeOwned>(status: u16, body: &str) -> Result<T, AppError> {
    if status == 401 {
        return Err(AppError::Unauthorized);
    }
    if !(200..300).contains(&status) {
        let detail = serde_json::from_str::<serde_json::Value>(body)
            .ok()
            .and_then(|value| {
                value
                    .get("error")
                    .and_then(|error| error.as_str())
                    .map(str::to_string)
            })
            .unwrap_or_else(|| format!("HTTP {status}"));
        return Err(AppError::Api(detail));
    }
    serde_json::from_str(body).map_err(|error| AppError::Decode(error.to_string()))
}

impl ApiClient {
    pub fn new(settings: &Settings, http: Client) -> Result<Self, AppError> {
        // Revalidates the scheme at the last gate before reqwest: a settings
        // file is not a trust boundary.
        let base = Url::parse(&normalize_base_url(&settings.base_url)?)
            .map_err(|error| AppError::Config(format!("URL da API inválida: {error}")))?;
        Ok(Self {
            base,
            token: settings.token.clone(),
            http,
        })
    }

    /// Concatenates instead of `Url::join`, which would discard a path prefix
    /// in the base (a deployment behind `https://gw.example/evo-agent`).
    fn url(&self, path: &str) -> Result<Url, AppError> {
        let base = self.base.as_str().trim_end_matches('/');
        Url::parse(&format!("{base}{path}"))
            .map_err(|error| AppError::Config(error.to_string()))
    }

    pub async fn get<T: DeserializeOwned>(
        &self,
        path: &str,
        query: &[(&str, String)],
    ) -> Result<T, AppError> {
        let url = self.url(path)?;
        // Empty values are dropped so the API applies its own defaults.
        let params: Vec<(&str, &str)> = query
            .iter()
            .filter(|(_, value)| !value.is_empty())
            .map(|(key, value)| (*key, value.as_str()))
            .collect();
        self.send(Method::GET, url, Some(params), None).await
    }

    pub async fn post<T: DeserializeOwned>(
        &self,
        path: &str,
        body: serde_json::Value,
    ) -> Result<T, AppError> {
        let url = self.url(path)?;
        self.send(Method::POST, url, None, Some(body)).await
    }

    async fn send<T: DeserializeOwned>(
        &self,
        method: Method,
        url: Url,
        query: Option<Vec<(&str, &str)>>,
        body: Option<serde_json::Value>,
    ) -> Result<T, AppError> {
        if self.token.is_empty() {
            return Err(AppError::NotConfigured);
        }

        let endpoint = url.to_string();
        let mut request = self.http.request(method, url).bearer_auth(&self.token);
        if let Some(params) = query {
            request = request.query(&params);
        }
        if let Some(payload) = body {
            request = request.json(&payload);
        }

        let response = request.send().await.map_err(|error| AppError::Network {
            url: endpoint,
            detail: error.to_string(),
        })?;
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        interpret(status, &body)
    }
}

#[path = "client_tests.rs"]
#[cfg(test)]
mod tests;
