use tauri::State;
use crate::AppState;
use crate::models::paper::ImportPreview;
use crate::services::{doi_import, duplicate_detection::DuplicateChecker};
use serde::{Deserialize, Serialize};

#[tauri::command]
pub async fn fetch_doi_preview(doi: String, state: State<'_, AppState>) -> Result<ImportPreview, String> {
    let metadata = doi_import::fetch_doi_metadata(&doi).await
        .map_err(|e| e.to_string())?;

    let (duplicate_candidates, missing_fields, uncertain_fields) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let checker = DuplicateChecker::new(&conn);
        let dupes = checker.find_duplicates(
            Some(&metadata.doi),
            metadata.title.as_deref(),
            &metadata.authors,
            metadata.year,
            None,
        ).map_err(|e| e.to_string())?;
        (dupes, metadata.missing_fields, metadata.uncertain_fields)
    };

    Ok(ImportPreview {
        title: metadata.title,
        doi: Some(metadata.doi),
        authors: metadata.authors,
        year: metadata.year,
        journal: metadata.journal,
        abstract_text: metadata.abstract_text,
        missing_fields,
        uncertain_fields,
        duplicate_candidates,
        source_type: "DOI".to_string(),
        pdf_path: None,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PdfParseResult {
    pub title: Option<String>,
    pub doi: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub full_text_preview: Option<String>,
    pub missing_fields: Vec<String>,
    pub uncertain_fields: Vec<String>,
    pub pdf_path: String,
}

#[tauri::command]
pub async fn parse_pdf(pdf_path: String, state: State<'_, AppState>) -> Result<ImportPreview, String> {
    // PDF parsing: extract metadata from the PDF file
    // In a full implementation, this would use a PDF library
    // For now, return a preview with what we can extract
    let file_name = std::path::Path::new(&pdf_path)
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let mut missing_fields = vec![
        "Abstract".to_string(),
        "Authors".to_string(),
        "Year".to_string(),
        "Journal".to_string(),
    ];
    let uncertain_fields = vec!["Title".to_string()];

    // Copy PDF to app data directory
    let dest_pdf_path = copy_pdf_to_storage(&pdf_path).map_err(|e| e.to_string())?;

    let dupes = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let checker = DuplicateChecker::new(&conn);
        checker.find_duplicates(None, Some(&file_name), &[], None, None)
            .map_err(|e| e.to_string())?
    };

    Ok(ImportPreview {
        title: Some(file_name),
        doi: None,
        authors: vec![],
        year: None,
        journal: None,
        abstract_text: None,
        missing_fields,
        uncertain_fields,
        duplicate_candidates: dupes,
        source_type: "PDF".to_string(),
        pdf_path: Some(dest_pdf_path),
    })
}

#[tauri::command]
pub async fn check_duplicates(
    doi: Option<String>,
    title: Option<String>,
    authors: Vec<String>,
    year: Option<i32>,
    exclude_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::models::paper::DuplicateCandidate>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let checker = DuplicateChecker::new(&conn);
    checker.find_duplicates(
        doi.as_deref(),
        title.as_deref(),
        &authors,
        year,
        exclude_id.as_deref(),
    ).map_err(|e| e.to_string())
}

fn copy_pdf_to_storage(source_path: &str) -> anyhow::Result<String> {
    let pdf_dir = crate::db::get_pdf_dir();
    let file_name = std::path::Path::new(source_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document.pdf");

    // Generate unique filename
    let unique_name = format!("{}_{}", uuid::Uuid::new_v4(), file_name);
    let dest = pdf_dir.join(&unique_name);
    std::fs::copy(source_path, &dest)?;

    // Store relative path
    Ok(format!("pdfs/{}", unique_name))
}

#[tauri::command]
pub async fn open_pdf(relative_path: String) -> Result<(), String> {
    let pdf_dir = crate::db::get_pdf_dir().parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| crate::db::get_pdf_dir());
    let full_path = pdf_dir.join(&relative_path);

    if !full_path.exists() {
        return Err(format!("PDF file not found: {}", full_path.display()));
    }

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", "", full_path.to_str().unwrap_or("")])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(full_path.to_str().unwrap_or(""))
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(full_path.to_str().unwrap_or(""))
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
