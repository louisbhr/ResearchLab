pub mod schema;

use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;

pub fn get_db_path() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ResearchLab");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("database.sqlite")
}

pub fn get_pdf_dir() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ResearchLab")
        .join("pdfs");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir
}

pub fn get_backup_dir() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ResearchLab")
        .join("backups");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir
}

pub fn open_connection() -> Result<Connection> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    schema::initialize_schema(&conn)?;
    Ok(conn)
}
