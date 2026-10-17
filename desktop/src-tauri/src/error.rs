use serde::{Serialize, Serializer};

/// Everything the webview sees is a pt-BR sentence: the console is a pt-BR app
/// and the messages are shown verbatim.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Config(String),
    #[error("API do agente não configurada: informe a URL e o token em Ajustes")]
    NotConfigured,
    #[error("token recusado pela API: confira o API_TOKEN configurado no agente")]
    Unauthorized,
    #[error("{0}")]
    Api(String),
    #[error("não foi possível falar com a API em {url}: {detail}")]
    Network { url: String, detail: String },
    #[error("resposta inesperada da API: {0}")]
    Decode(String),
    #[error("não foi possível abrir o link: {0}")]
    Link(String),
    #[error("{0}")]
    Io(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub fn io_error(error: std::io::Error) -> AppError {
    AppError::Io(error.to_string())
}
