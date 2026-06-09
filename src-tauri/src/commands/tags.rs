use tauri::State;
use crate::AppState;
use crate::models::tag::*;
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;

#[tauri::command]
pub async fn get_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    fetch_all_tags(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag(input: CreateTagInput, state: State<'_, AppState>) -> Result<Tag, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let normalized = input.name.to_lowercase().trim().to_string();

    // Check for existing
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM tags WHERE normalized_name = ?1",
        [&normalized],
        |r| r.get(0),
    ).ok();

    if existing.is_some() {
        return Err(format!("A tag named '{}' already exists.", input.name));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO tags (id, name, normalized_name, description, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, input.name, normalized, input.description, now],
    ).map_err(|e| e.to_string())?;

    Ok(Tag {
        id,
        name: input.name,
        normalized_name: normalized,
        description: input.description,
        created_at: now,
        paper_count: Some(0),
    })
}

#[tauri::command]
pub async fn delete_tag(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tags WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn check_similar_tags(name: String, state: State<'_, AppState>) -> Result<Vec<SimilarTagWarning>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tags = fetch_all_tags(&conn).map_err(|e| e.to_string())?;
    let normalized_input = name.to_lowercase().trim().to_string();

    let warnings: Vec<SimilarTagWarning> = tags
        .iter()
        .filter_map(|t| {
            let sim = tag_name_similarity(&normalized_input, &t.normalized_name);
            if sim >= 0.7 && normalized_input != t.normalized_name {
                Some(SimilarTagWarning {
                    existing_tag_id: t.id.clone(),
                    existing_tag_name: t.name.clone(),
                    similarity_score: sim,
                })
            } else {
                None
            }
        })
        .collect();

    Ok(warnings)
}

pub fn fetch_all_tags(conn: &rusqlite::Connection) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.normalized_name, t.description, t.created_at,
                COUNT(pt.paper_id) as paper_count
         FROM tags t
         LEFT JOIN paper_tags pt ON pt.tag_id = t.id
         GROUP BY t.id
         ORDER BY paper_count DESC, t.name ASC"
    )?;

    let result: Vec<Tag> = stmt.query_map([], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
            normalized_name: r.get(2)?,
            description: r.get(3)?,
            created_at: r.get(4)?,
            paper_count: r.get(5)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(result)
}

fn tag_name_similarity(a: &str, b: &str) -> f64 {
    if a == b { return 1.0; }
    let len_a = a.len();
    let len_b = b.len();
    if len_a == 0 || len_b == 0 { return 0.0; }

    // Check if one contains the other
    if a.contains(b) || b.contains(a) { return 0.85; }

    // Simple character overlap
    let chars_a: std::collections::HashSet<char> = a.chars().collect();
    let chars_b: std::collections::HashSet<char> = b.chars().collect();
    let intersection = chars_a.intersection(&chars_b).count();
    let union = chars_a.union(&chars_b).count();
    if union == 0 { return 0.0; }
    intersection as f64 / union as f64
}
