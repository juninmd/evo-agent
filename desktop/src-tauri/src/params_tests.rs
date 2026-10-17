use crate::error::AppError;
use crate::params::{opt_number, opt_text, require_mode, require_slug};

#[test]
fn formats_optional_query_values_as_empty_when_absent() {
    assert_eq!(opt_number(None), "");
    assert_eq!(opt_number(Some(25)), "25");
    assert_eq!(opt_text(None), "");
    assert_eq!(opt_text(Some("  daily ".to_string())), "daily");
}

#[test]
fn accepts_a_generated_slug_and_rejects_path_tricks() {
    assert_eq!(
        require_slug("radar-2026-09-22").unwrap(),
        "radar-2026-09-22"
    );

    for raw in ["", "  ", "../health", "a/b", "UPPER", "com espaço"] {
        assert!(require_slug(raw).is_err(), "{raw} should be rejected");
    }
    assert!(require_slug(&"a".repeat(81)).is_err());
}

#[test]
fn normalizes_a_run_mode_and_rejects_anything_else() {
    assert_eq!(require_mode(" daily ").unwrap(), "DAILY");
    assert!(require_mode("").is_err());
    assert!(require_mode("DAILY; rm -rf /").is_err());
    assert!(matches!(require_mode("DAEMON!!"), Err(AppError::Config(_))));
}
