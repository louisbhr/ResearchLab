use tauri::State;
use crate::AppState;
use crate::services::backup as backup_service;
use serde::{Deserialize, Serialize};

#[tauri::command]
pub async fn create_backup(dest_path: String, include_pdfs: bool) -> Result<String, String> {
    backup_service::create_backup(&dest_path, include_pdfs).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_backup(source_path: String) -> Result<backup_service::BackupManifest, String> {
    backup_service::restore_backup(&source_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inspect_backup(source_path: String) -> Result<backup_service::BackupManifest, String> {
    backup_service::inspect_backup(&source_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_backup_dir() -> Result<String, String> {
    Ok(crate::db::get_backup_dir().to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_data_dir() -> Result<String, String> {
    let dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ResearchLab");
    Ok(dir.to_string_lossy().to_string())
}
