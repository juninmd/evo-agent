//! Homologação do contrato entre o console e um agente real.
//!
//! Ignorado por padrão: a CI não tem um agente no ar, e este teste existe para
//! provar a costura que o resto da suíte não alcança — as structs Rust contra o
//! JSON que o processo Node realmente devolve.
//!
//! ```text
//! # terminal 1
//! RUN_MODE=API API_TOKEN=homolog API_PORT=8787 npm start
//! # terminal 2
//! EVO_AGENT_API_URL=http://127.0.0.1:8787 API_TOKEN=homolog \
//!   cargo test --test live_api -- --ignored --nocapture
//! ```

use evo_agent_console_lib::client::{build_http_client, ApiClient};
use evo_agent_console_lib::settings::Settings;
use evo_agent_console_lib::types::{Health, Meta, Overview, Page, Prompts};

fn client() -> ApiClient {
    let base_url = std::env::var("EVO_AGENT_API_URL")
        .expect("defina EVO_AGENT_API_URL com a URL do agente em modo API");
    let token = std::env::var("API_TOKEN").expect("defina API_TOKEN com o token do agente");
    ApiClient::new(
        &Settings { base_url, token },
        build_http_client().expect("cliente HTTP"),
    )
    .expect("cliente da API")
}

#[test]
#[ignore = "requer um agente em RUN_MODE=API no ar"]
fn reads_every_console_endpoint_from_a_live_agent() {
    tauri::async_runtime::block_on(async {
        let client = client();

        let meta: Meta = client.get("/api/v1/meta", &[]).await.expect("meta");
        println!(
            "meta: mode={} timezone={} runs={} modos={}",
            meta.run_mode,
            meta.timezone,
            meta.runs_enabled,
            meta.runnable_modes.len()
        );
        assert_eq!(meta.run_mode, "API");

        let health: Health = client.get("/api/v1/health", &[]).await.expect("health");
        println!("health: {} ({:?})", health.status, health.reasons);

        let overview: Overview = client.get("/api/v1/overview", &[]).await.expect("overview");
        println!(
            "overview: {} edições hoje de {}, {} ciclos, {} fontes ({} com falha)",
            overview.editions_today,
            overview.daily_editions_target,
            overview.last_cycles.len(),
            overview.sources.total,
            overview.sources.failing
        );

        let editions: Page<evo_agent_console_lib::types::Edition> = client
            .get("/api/v1/editions", &[("limit", "3".to_string())])
            .await
            .expect("editions");
        println!("editions: {} devolvidas", editions.items.len());
        if let Some(first) = editions.items.first() {
            let detail = client
                .get::<evo_agent_console_lib::types::EditionDetail>(
                    &format!("/api/v1/editions/{}", first.slug),
                    &[],
                )
                .await
                .expect("edition detail");
            println!(
                "edição {}: {} evidências, notificação {}",
                first.slug,
                detail.evidence.len(),
                detail.edition.notification_status
            );
        }

        let prompts: Prompts = client.get("/api/v1/prompts", &[]).await.expect("prompts");
        println!(
            "prompts: ativo={} versões={}",
            prompts.active.is_some(),
            prompts.items.len()
        );

        client
            .get::<evo_agent_console_lib::types::Page<evo_agent_console_lib::types::CycleRun>>(
                "/api/v1/cycles",
                &[("limit", "5".to_string())],
            )
            .await
            .expect("cycles");
        client
            .get::<evo_agent_console_lib::types::SourcePage>(
                "/api/v1/sources",
                &[("days", "30".to_string())],
            )
            .await
            .expect("sources");
        client
            .get::<evo_agent_console_lib::types::Metrics>(
                "/api/v1/metrics",
                &[("hours", "720".to_string())],
            )
            .await
            .expect("metrics");
    });
}

#[test]
#[ignore = "requer um agente em RUN_MODE=API no ar"]
fn rejects_the_wrong_token_against_a_live_agent() {
    tauri::async_runtime::block_on(async {
        let mut settings = Settings {
            base_url: std::env::var("EVO_AGENT_API_URL").expect("EVO_AGENT_API_URL"),
            token: "definitely-not-the-token".to_string(),
        };
        settings.token.push_str("-wrong");
        let client = ApiClient::new(&settings, build_http_client().unwrap()).unwrap();
        let result: Result<Meta, _> = client.get("/api/v1/meta", &[]).await;
        assert!(result.is_err(), "um token errado não pode ser aceito");
    });
}
