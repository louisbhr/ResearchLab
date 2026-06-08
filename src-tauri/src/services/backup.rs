use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupManifest {
    pub version: String,
    pub created_at: String,
    pub includes_pdfs: bool,
    pub paper_count: i64,
    pub tag_count: i64,
    pub project_count: i64,
    pub insight_count: i64,
}

pub fn create_backup(dest_path: &str, include_pdfs: bool) -> Result<String> {
    use crate::db;
    let db_path = db::get_db_path();
    let pdf_dir = db::get_pdf_dir();

    let file = std::fs::File::create(dest_path)?;
    let mut zip = zip::ZipWriter::new(file);

    let make_options = || -> zip::write::FileOptions<zip::write::ExtendedFileOptions> {
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated)
    };

    // Include the database
    let db_bytes = std::fs::read(&db_path)
        .map_err(|e| anyhow!("Cannot read database: {}", e))?;
    zip.start_file("database.sqlite", make_options())?;
    zip.write_all(&db_bytes)?;

    // Count items for manifest
    let conn = db::open_connection()?;
    let paper_count: i64 = conn.query_row("SELECT COUNT(*) FROM papers", [], |r| r.get(0))?;
    let tag_count: i64 = conn.query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0))?;
    let project_count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))?;
    let insight_count: i64 = conn.query_row("SELECT COUNT(*) FROM insights", [], |r| r.get(0))?;

    if include_pdfs && pdf_dir.exists() {
        zip.add_directory("pdfs/", make_options())?;
        for entry in std::fs::read_dir(&pdf_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    let file_bytes = std::fs::read(&path)?;
                    zip.start_file(format!("pdfs/{}", file_name), make_options())?;
                    zip.write_all(&file_bytes)?;
                }
            }
        }
    }

    let manifest = BackupManifest {
        version: "1.0.0".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        includes_pdfs: include_pdfs,
        paper_count,
        tag_count,
        project_count,
        insight_count,
    };

    let manifest_json = serde_json::to_string_pretty(&manifest)?;
    zip.start_file("manifest.json", make_options())?;
    zip.write_all(manifest_json.as_bytes())?;

    zip.finish()?;
    Ok(dest_path.to_string())
}

pub fn restore_backup(source_path: &str) -> Result<BackupManifest> {
    use crate::db;
    let db_path = db::get_db_path();
    let pdf_dir = db::get_pdf_dir();

    let file = std::fs::File::open(source_path)
        .map_err(|e| anyhow!("Cannot open backup file: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| anyhow!("Invalid backup file format: {}", e))?;

    // Read manifest first
    let manifest: BackupManifest = {
        let manifest_file = archive.by_name("manifest.json")
            .map_err(|_| anyhow!("Backup file is missing manifest. It may be corrupted."))?;
        serde_json::from_reader(manifest_file)?
    };

    // Restore database
    {
        let mut db_file = archive.by_name("database.sqlite")
            .map_err(|_| anyhow!("Backup file is missing database."))?;
        let mut buffer = Vec::new();
        std::io::copy(&mut db_file, &mut buffer)?;
        std::fs::write(&db_path, &buffer)?;
    }

    // Restore PDFs if present
    if manifest.includes_pdfs {
        let names: Vec<String> = archive
            .file_names()
            .filter(|n| n.starts_with("pdfs/") && !n.ends_with('/'))
            .map(String::from)
            .collect();

        for name in names {
            let file_name = Path::new(&name)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default()
                .to_string();
            if file_name.is_empty() { continue; }

            let mut pdf_file = archive.by_name(&name)?;
            let dest = pdf_dir.join(&file_name);
            let mut out = std::fs::File::create(&dest)?;
            std::io::copy(&mut pdf_file, &mut out)?;
        }
    }

    Ok(manifest)
}

pub fn inspect_backup(source_path: &str) -> Result<BackupManifest> {
    let file = std::fs::File::open(source_path)
        .map_err(|e| anyhow!("Cannot open backup file: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| anyhow!("Invalid backup file format: {}", e))?;

    let manifest_file = archive.by_name("manifest.json")
        .map_err(|_| anyhow!("Backup file is missing manifest."))?;
    let manifest: BackupManifest = serde_json::from_reader(manifest_file)?;
    Ok(manifest)
}
