use crate::client::{build_http_client, interpret, ApiClient};
use crate::error::AppError;
use crate::settings::Settings;
use crate::types::Meta;

#[test]
fn maps_a_successful_body_to_the_typed_struct() {
    let body = r#"{
        "runMode": "API",
        "timezone": "America/Sao_Paulo",
        "dailyEditions": 3,
        "schedule": {
            "crawlIntervalMinutes": 40,
            "articleCron": "0 8,13,18 * * *",
            "radarCron": "0 21 * * *",
            "modelAlertCron": "*/30 * * * *"
        },
        "database": { "path": "/app/data/knowledge.db" },
        "runsEnabled": true,
        "runnableModes": ["CRAWL", "DAILY"],
        "startedAt": "2026-10-17T12:00:00.000Z",
        "uptimeSeconds": 90
    }"#;

    let meta: Meta = interpret(200, body).unwrap();
    assert_eq!(meta.run_mode, "API");
    assert_eq!(meta.schedule.article_cron, "0 8,13,18 * * *");
    assert_eq!(meta.database.path, "/app/data/knowledge.db");
    assert!(meta.runs_enabled);
    assert_eq!(meta.uptime_seconds, 90);
}

#[test]
fn reports_a_rejected_token_as_unauthorized() {
    assert!(matches!(
        interpret::<Meta>(401, r#"{"error":"invalid token"}"#),
        Err(AppError::Unauthorized)
    ));
}

#[test]
fn surfaces_the_api_message_for_every_other_failure() {
    let error = interpret::<Meta>(501, r#"{"error":"API_ALLOW_RUNS is not true"}"#)
        .expect_err("501 must fail");
    assert!(matches!(error, AppError::Api(message) if message.contains("API_ALLOW_RUNS")));

    // A proxy in front of the API answers with HTML, not JSON.
    let error = interpret::<Meta>(502, "<html>bad gateway</html>").expect_err("502 must fail");
    assert!(matches!(error, AppError::Api(message) if message == "HTTP 502"));
}

#[test]
fn reports_a_body_that_does_not_match_the_contract() {
    let error = interpret::<Meta>(200, r#"{"runMode":"API"}"#).expect_err("must fail");
    assert!(matches!(error, AppError::Decode(_)));
}

#[test]
fn requires_a_url_the_client_can_reach() {
    let http = build_http_client().unwrap();

    for base_url in ["file:///etc/passwd", "data:text/plain,x", ""] {
        let broken = Settings {
            base_url: base_url.to_string(),
            token: "t".to_string(),
        };
        assert!(
            matches!(
                ApiClient::new(&broken, http.clone()),
                Err(AppError::Config(_))
            ),
            "{base_url} should be rejected"
        );
    }

    let configured = Settings {
        base_url: "http://127.0.0.1:8787".to_string(),
        token: "t".to_string(),
    };
    assert!(ApiClient::new(&configured, http).is_ok());
}

#[test]
fn keeps_a_path_prefix_from_the_base_url() {
    let http = build_http_client().unwrap();
    let client = ApiClient::new(
        &Settings {
            base_url: "https://gw.example/evo-agent".to_string(),
            token: "t".to_string(),
        },
        http,
    )
    .unwrap();

    assert_eq!(
        client.url("/api/v1/meta").unwrap().as_str(),
        "https://gw.example/evo-agent/api/v1/meta"
    );
    assert_eq!(
        client.url("/api/v1/editions/radar-2026-09-22").unwrap().as_str(),
        "https://gw.example/evo-agent/api/v1/editions/radar-2026-09-22"
    );
}
