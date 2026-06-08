use tauri::State;
use crate::AppState;
use crate::models::insight::*;
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;

#[tauri::command]
pub async fn get_insights(filter: Option<InsightFilter>, state: State<'_, AppState>) -> Result<Vec<Insight>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    fetch_insights(&conn, filter.as_ref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_insight(id: String, state: State<'_, AppState>) -> Result<Option<Insight>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    fetch_insight_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_insight(input: CreateInsightInput, state: State<'_, AppState>) -> Result<Insight, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let paper_ids_json = serde_json::to_string(&input.used_paper_ids).unwrap_or_default();

    conn.execute(
        "INSERT INTO insights (id, title, analysis_type, result, used_filters, used_paper_ids, created_at, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id, input.title, input.analysis_type, input.result,
            input.used_filters, paper_ids_json, now, input.notes
        ],
    ).map_err(|e| e.to_string())?;

    fetch_insight_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Insight not found after insert".to_string())
}

#[tauri::command]
pub async fn delete_insight(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM insights WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_insight_notes(id: String, notes: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE insights SET notes = ?2 WHERE id = ?1", [&id, &notes])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn fetch_insights(conn: &rusqlite::Connection, filter: Option<&InsightFilter>) -> Result<Vec<Insight>> {
    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(f) = filter {
        if let Some(ref at) = f.analysis_type {
            conditions.push("analysis_type = ?".to_string());
            params.push(Box::new(at.clone()));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!("SELECT id, title, analysis_type, result, used_filters, used_paper_ids, created_at, notes FROM insights {} ORDER BY created_at DESC", where_clause);
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql)?;
    let result: Vec<Insight> = stmt.query_map(param_refs.as_slice(), |r| {
        let paper_ids_json: String = r.get(5)?;
        let paper_ids: Vec<String> = serde_json::from_str(&paper_ids_json).unwrap_or_default();
        Ok(Insight {
            id: r.get(0)?,
            title: r.get(1)?,
            analysis_type: r.get(2)?,
            result: r.get(3)?,
            used_filters: r.get(4)?,
            used_paper_ids: paper_ids,
            created_at: r.get(6)?,
            notes: r.get(7)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(result)
}

fn fetch_insight_by_id(conn: &rusqlite::Connection, id: &str) -> Result<Option<Insight>> {
    let result = conn.query_row(
        "SELECT id, title, analysis_type, result, used_filters, used_paper_ids, created_at, notes FROM insights WHERE id = ?1",
        [id],
        |r| {
            let paper_ids_json: String = r.get(5)?;
            let paper_ids: Vec<String> = serde_json::from_str(&paper_ids_json).unwrap_or_default();
            Ok(Insight {
                id: r.get(0)?,
                title: r.get(1)?,
                analysis_type: r.get(2)?,
                result: r.get(3)?,
                used_filters: r.get(4)?,
                used_paper_ids: paper_ids,
                created_at: r.get(6)?,
                notes: r.get(7)?,
            })
        },
    );
    match result {
        Ok(i) => Ok(Some(i)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}
