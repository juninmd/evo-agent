pub mod client;
pub mod cmd_feeds;
pub mod cmd_runs;
pub mod commands;
pub mod error;
pub mod params;
pub mod settings;
pub mod state;
pub mod types;

use tauri::Manager;

use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_config_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(AppState::new(dir)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings_get,
            commands::settings_save,
            commands::settings_test,
            commands::overview,
            commands::health,
            commands::meta,
            commands::editions,
            commands::edition_detail,
            commands::open_external,
            cmd_feeds::articles,
            cmd_feeds::sources,
            cmd_feeds::cycles,
            cmd_feeds::prompts,
            cmd_feeds::metrics,
            cmd_runs::run_start,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o console do evo-agent");
}
