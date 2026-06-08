use tauri::State;
use crate::AppState;
use crate::models::project::*;
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;

#[tauri::command]
pub async fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    fetch_all_projects(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_project(input: CreateProjectInput, state: State<'_, AppState>) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO projects (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, input.name, input.description, now],
    ).map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name: input.name,
        description: input.description,
        created_at: now,
        paper_count: Some(0),
    })
}

#[tauri::command]
pub async fn update_project(input: UpdateProjectInput, state: State<'_, AppState>) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE projects SET name = COALESCE(?2, name), description = COALESCE(?3, description) WHERE id = ?1",
        rusqlite::params![input.id, input.name, input.description],
    ).map_err(|e| e.to_string())?;

    fetch_project_by_id(&conn, &input.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Project not found".to_string())
}

#[tauri::command]
pub async fn delete_project(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn fetch_all_projects(conn: &rusqlite::Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.description, p.created_at,
                COUNT(pp.paper_id) as paper_count
         FROM projects p
         LEFT JOIN paper_projects pp ON pp.project_id = p.id
         GROUP BY p.id ORDER BY p.created_at ASC"
    )?;
    let result: Vec<Project> = stmt.query_map([], |r| {
        Ok(Project {
            id: r.get(0)?,
            name: r.get(1)?,
            description: r.get(2)?,
            created_at: r.get(3)?,
            paper_count: r.get(4)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(result)
}

fn fetch_project_by_id(conn: &rusqlite::Connection, id: &str) -> Result<Option<Project>> {
    let result = conn.query_row(
        "SELECT p.id, p.name, p.description, p.created_at,
                COUNT(pp.paper_id) as paper_count
         FROM projects p
         LEFT JOIN paper_projects pp ON pp.project_id = p.id
         WHERE p.id = ?1 GROUP BY p.id",
        [id],
        |r| Ok(Project {
            id: r.get(0)?,
            name: r.get(1)?,
            description: r.get(2)?,
            created_at: r.get(3)?,
            paper_count: r.get(4)?,
        }),
    );
    match result {
        Ok(p) => Ok(Some(p)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}
