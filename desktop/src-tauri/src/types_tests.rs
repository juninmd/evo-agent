use crate::types::{Calendar, Edition, EditionDetail};

const EDITION_FROM_AN_OLDER_AGENT: &str = r#"{
    "slug": "2026-10-17-edicao",
    "title": "Edição",
    "url": "https://pages.test/a.html",
    "date": "2026-10-17",
    "summary": "",
    "tags": ["ai"],
    "kind": "article",
    "period": null,
    "notificationStatus": "delivered",
    "notificationAttempts": 1,
    "notificationError": null,
    "editorialMetrics": {},
    "publishedAt": "2026-10-17 12:05:00"
}"#;

#[test]
fn reads_the_lifecycle_fields_of_an_edition() {
    let body = r#"{
        "slug": "2026-10-17-edicao",
        "title": "Edição",
        "url": "https://pages.test/a.html",
        "date": "2026-10-17",
        "summary": "",
        "tags": [],
        "kind": "article",
        "period": null,
        "notificationStatus": "delivered",
        "notificationAttempts": 1,
        "notificationError": null,
        "editorialMetrics": {"selected": 6},
        "status": "corrected",
        "qualityScore": 84,
        "revision": 3,
        "publishedAt": "2026-10-17 12:05:00"
    }"#;

    let edition: Edition = serde_json::from_str(body).unwrap();
    assert_eq!(edition.status, "corrected");
    assert_eq!(edition.quality_score, Some(84));
    assert_eq!(edition.revision, 3);

    // The webview reads the same camelCase keys the agent sent.
    let echoed = serde_json::to_value(&edition).unwrap();
    assert_eq!(echoed["qualityScore"], 84);
    assert_eq!(echoed["status"], "corrected");
    assert_eq!(echoed["revision"], 3);
}

#[test]
fn defaults_the_lifecycle_fields_an_older_agent_does_not_send() {
    let edition: Edition = serde_json::from_str(EDITION_FROM_AN_OLDER_AGENT).unwrap();
    assert_eq!(edition.status, "published");
    assert_eq!(edition.quality_score, None);
    assert_eq!(edition.revision, 1);

    let detail: EditionDetail = serde_json::from_str(&format!(
        r#"{{"edition": {EDITION_FROM_AN_OLDER_AGENT}, "evidence": []}}"#
    ))
    .unwrap();
    assert!(detail.revisions.is_empty());
}

#[test]
fn reads_the_revision_list_of_an_edition_detail() {
    let detail: EditionDetail = serde_json::from_str(&format!(
        r#"{{
            "edition": {EDITION_FROM_AN_OLDER_AGENT},
            "evidence": [],
            "revisions": [{{
                "revision": 2,
                "reason": "update",
                "contentHash": "abc",
                "createdAt": "2026-10-17 13:00:00"
            }}]
        }}"#
    ))
    .unwrap();
    assert_eq!(detail.revisions[0].content_hash, "abc");
    assert_eq!(
        serde_json::to_value(&detail).unwrap()["revisions"][0]["createdAt"],
        "2026-10-17 13:00:00"
    );
}

#[test]
fn reads_the_publication_calendar() {
    let body = r#"{
        "target": 3,
        "today": "2026-10-17",
        "days": [
            {"date": "2026-10-16", "published": 3, "failedNotifications": 0},
            {"date": "2026-10-17", "published": 2, "failedNotifications": 1}
        ]
    }"#;

    let calendar: Calendar = serde_json::from_str(body).unwrap();
    assert_eq!(calendar.target, 3);
    assert_eq!(calendar.days[1].failed_notifications, 1);
    assert_eq!(
        serde_json::to_value(&calendar).unwrap()["days"][1]["failedNotifications"],
        1
    );
}
