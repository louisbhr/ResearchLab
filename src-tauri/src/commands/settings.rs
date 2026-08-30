use tauri::State;
use crate::AppState;
use crate::services::settings_service;
use serde::{Deserialize, Serialize};
use reqwest;

const DEFAULT_PAPER_TYPES: &[&str] = &[
    "Empirical Study", "Review / Survey", "Meta-Analysis", "Theoretical",
    "Methodology", "Case Study", "Technical Report", "Conference Paper",
    "Book Chapter", "Preprint", "Other",
];

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub claude_api_key_set: bool,
    pub claude_model: String,
    pub pdf_storage_path: String,
    pub db_path: String,
    pub theme: String,
    pub app_version: String,
    pub paper_types: Vec<String>,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let has_key = settings_service::get_setting(&conn, "claude_api_key")
        .map(|v| v.is_some())
        .unwrap_or(false);
    let model = settings_service::get_setting(&conn, "claude_model")
        .unwrap_or(None)
        .unwrap_or_else(|| "claude-sonnet-4-6".to_string());
    let theme = settings_service::get_setting(&conn, "theme")
        .unwrap_or(None)
        .unwrap_or_else(|| "light".to_string());
    let paper_types = settings_service::get_setting(&conn, "paper_types")
        .unwrap_or(None)
        .and_then(|json| serde_json::from_str::<Vec<String>>(&json).ok())
        .unwrap_or_else(|| DEFAULT_PAPER_TYPES.iter().map(|s| s.to_string()).collect());

    Ok(AppSettings {
        claude_api_key_set: has_key,
        claude_model: model,
        pdf_storage_path: crate::db::get_pdf_dir().to_string_lossy().to_string(),
        db_path: crate::db::get_db_path().to_string_lossy().to_string(),
        theme,
        app_version: "1.0.0".to_string(),
        paper_types,
    })
}

#[tauri::command]
pub async fn save_paper_types(types: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let json = serde_json::to_string(&types).map_err(|e| e.to_string())?;
    settings_service::set_setting(&conn, "paper_types", &json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_api_key(api_key: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    settings_service::set_setting(&conn, "claude_api_key", &api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_api_key(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    settings_service::get_setting(&conn, "claude_api_key")
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_setting(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    if key == "claude_api_key" {
        return Err("Use save_api_key for the API key".to_string());
    }
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    settings_service::set_setting(&conn, &key, &value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_api_connection(state: State<'_, AppState>) -> Result<bool, String> {
    let api_key = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        settings_service::get_setting(&conn, "claude_api_key")
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No API key configured".to_string())?
    };

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Hi"}]
        }))
        .send()
        .await
        .map_err(|e| format!("Connection test failed: {}", e))?;

    Ok(resp.status().is_success())
}
