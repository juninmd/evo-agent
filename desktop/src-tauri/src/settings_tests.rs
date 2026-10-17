use crate::settings::{normalize_base_url, pick_default_base_url, Settings, DEFAULT_BASE_URL};

fn temp_dir(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "evo-console-{name}-{}-{:?}",
        std::process::id(),
        std::thread::current().id()
    ));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn normalizes_http_urls_and_strips_the_trailing_slash() {
    assert_eq!(
        normalize_base_url("  https://agente.example/api/  ").unwrap(),
        "https://agente.example/api"
    );
    assert_eq!(
        normalize_base_url("http://127.0.0.1:8787").unwrap(),
        "http://127.0.0.1:8787"
    );
}

#[test]
fn rejects_a_scheme_that_is_not_http() {
    for raw in [
        "file:///etc/passwd",
        "ftp://host",
        "data:text/plain,x",
        "host",
    ] {
        assert!(normalize_base_url(raw).is_err(), "{raw} should be rejected");
    }
    assert!(normalize_base_url("   ").is_err());
}

#[test]
fn falls_back_to_the_default_when_the_file_is_missing_or_broken() {
    let dir = temp_dir("missing");
    assert_eq!(Settings::load(&dir).base_url, DEFAULT_BASE_URL);

    std::fs::write(Settings::path(&dir), "{ not json").unwrap();
    assert_eq!(Settings::load(&dir).base_url, DEFAULT_BASE_URL);

    // A file edited to a local-file URL must not survive the load.
    std::fs::write(
        Settings::path(&dir),
        r#"{"baseUrl":"file:///etc/passwd","token":"t"}"#,
    )
    .unwrap();
    let loaded = Settings::load(&dir);
    assert_eq!(loaded.base_url, DEFAULT_BASE_URL);
    assert_eq!(loaded.token, "t");
}

#[test]
fn round_trips_through_the_settings_file() {
    let dir = temp_dir("roundtrip");
    let settings = Settings {
        base_url: "https://agente.example".to_string(),
        token: "segredo".to_string(),
    };
    settings.save(&dir).unwrap();
    assert_eq!(Settings::load(&dir), settings);
}

#[test]
fn the_view_never_exposes_the_token() {
    let view = Settings {
        base_url: DEFAULT_BASE_URL.to_string(),
        token: "segredo".to_string(),
    }
    .view();
    assert!(view.has_token);

    let json = serde_json::to_string(&view).unwrap();
    assert_eq!(
        json,
        r#"{"baseUrl":"http://127.0.0.1:8787","hasToken":true}"#
    );
    assert!(!json.contains("segredo"));
}

#[test]
fn the_environment_url_only_wins_when_it_is_usable() {
    assert_eq!(
        pick_default_base_url(Some("https://cluster.example/".to_string())),
        "https://cluster.example"
    );
    assert_eq!(
        pick_default_base_url(Some("file:///etc/passwd".to_string())),
        DEFAULT_BASE_URL
    );
    assert_eq!(pick_default_base_url(None), DEFAULT_BASE_URL);
}
