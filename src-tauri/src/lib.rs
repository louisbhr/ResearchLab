mod commands;
mod db;
mod models;
mod services;

use std::sync::Mutex;
use rusqlite::Connection;

pub struct AppState {
    pub conn: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = db::open_connection().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .manage(AppState { conn: Mutex::new(conn) })
        .invoke_handler(tauri::generate_handler![
            // Papers
            commands::papers::get_papers,
            commands::papers::get_paper,
            commands::papers::create_paper,
            commands::papers::update_paper,
            commands::papers::delete_paper,
            commands::papers::get_paper_count,
            // Import
            commands::import::fetch_doi_preview,
            commands::import::parse_pdf,
            commands::import::check_duplicates,
            commands::import::open_pdf,
            // Tags
            commands::tags::get_tags,
            commands::tags::create_tag,
            commands::tags::delete_tag,
            commands::tags::check_similar_tags,
            // Projects
            commands::projects::get_projects,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            // Insights
            commands::insights::get_insights,
            commands::insights::get_insight,
            commands::insights::create_insight,
            commands::insights::delete_insight,
            commands::insights::update_insight_notes,
            // Backup
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::inspect_backup,
            commands::backup::get_backup_dir,
            commands::backup::get_data_dir,
            // Settings
            commands::settings::get_settings,
            commands::settings::save_api_key,
            commands::settings::get_api_key,
            commands::settings::save_setting,
            commands::settings::test_api_connection,
            // Analytics
            commands::analytics::get_analytics,
            // Recommendations
            commands::recommendations::find_papers_for_topic,
            commands::recommendations::get_suggested_papers,
            commands::recommendations::update_suggested_paper_status,
        ])
        .run(tauri::generate_context!())
        .expect("Error running ResearchLab");
}
