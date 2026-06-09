use tauri::State;
use crate::AppState;
use crate::models::paper::*;
use anyhow::Result;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub async fn get_papers(filter: Option<PaperFilter>, state: State<'_, AppState>) -> Result<Vec<Paper>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    fetch_papers(&conn, filter.as_ref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_paper(id: String, state: State<'_, AppState>) -> Result<Option<Paper>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    fetch_paper_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_paper(input: CreatePaperInput, state: State<'_, AppState>) -> Result<Paper, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    insert_paper(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_paper(input: UpdatePaperInput, state: State<'_, AppState>) -> Result<Paper, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    update_paper_record(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_paper(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM papers WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_paper_count(state: State<'_, AppState>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT COUNT(*) FROM papers", [], |r| r.get(0))
        .map_err(|e| e.to_string())
}

pub fn fetch_papers(conn: &rusqlite::Connection, filter: Option<&PaperFilter>) -> Result<Vec<Paper>> {
    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(f) = filter {
        if let Some(ref project_id) = f.project_id {
            if project_id != "all" {
                conditions.push("EXISTS (SELECT 1 FROM paper_projects pp WHERE pp.paper_id = p.id AND pp.project_id = ?)".to_string());
                params.push(Box::new(project_id.clone()));
            }
        }

        if let Some(ref tag_ids) = f.tag_ids {
            if !tag_ids.is_empty() {
                let placeholders: Vec<String> = (0..tag_ids.len()).map(|_| "?".to_string()).collect();
                conditions.push(format!(
                    "EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id AND pt.tag_id IN ({}))",
                    placeholders.join(",")
                ));
                for tid in tag_ids {
                    params.push(Box::new(tid.clone()));
                }
            }
        }

        if let Some(ref statuses) = f.reading_status {
            if !statuses.is_empty() {
                let placeholders: Vec<String> = (0..statuses.len()).map(|_| "?".to_string()).collect();
                conditions.push(format!("p.reading_status IN ({})", placeholders.join(",")));
                for s in statuses {
                    params.push(Box::new(s.clone()));
                }
            }
        }

        if let Some(ref types) = f.paper_type {
            if !types.is_empty() {
                let placeholders: Vec<String> = (0..types.len()).map(|_| "?".to_string()).collect();
                conditions.push(format!("p.paper_type IN ({})", placeholders.join(",")));
                for t in types {
                    params.push(Box::new(t.clone()));
                }
            }
        }

        if let Some(year_from) = f.year_from {
            conditions.push("p.year >= ?".to_string());
            params.push(Box::new(year_from));
        }

        if let Some(year_to) = f.year_to {
            conditions.push("p.year <= ?".to_string());
            params.push(Box::new(year_to));
        }

        if let Some(min_rel) = f.relevance_min {
            conditions.push("p.relevance_rating >= ?".to_string());
            params.push(Box::new(min_rel));
        }

        if let Some(true) = f.favorite_only {
            conditions.push("p.favorite = 1".to_string());
        }

        if let Some(ref q) = f.search_query {
            if !q.is_empty() {
                conditions.push("(p.title LIKE ? OR p.abstract_text LIKE ? OR p.personal_notes LIKE ?)".to_string());
                let pattern = format!("%{}%", q);
                params.push(Box::new(pattern.clone()));
                params.push(Box::new(pattern.clone()));
                params.push(Box::new(pattern));
            }
        }
    }

    let sort_col = filter
        .and_then(|f| f.sort_by.as_deref())
        .unwrap_or("date_added");
    let sort_dir = if filter.and_then(|f| f.sort_desc).unwrap_or(true) { "DESC" } else { "ASC" };

    let safe_sort = match sort_col {
        "title" => "p.title",
        "year" => "p.year",
        "relevance" => "p.relevance_rating",
        "date_added" => "p.date_added",
        "date_modified" => "p.date_modified",
        "paper_type" => "p.paper_type",
        "reading_status" => "p.reading_status",
        _ => "p.date_added",
    };

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT p.id, p.title, p.doi, p.year, p.journal, p.abstract_text, p.pdf_path,
                p.source_type, p.short_summary, p.key_findings, p.paper_type,
                p.reading_status, p.relevance_rating, p.favorite, p.personal_notes,
                p.date_added, p.date_modified, p.ai_analysis_status, p.ai_analysis_date
         FROM papers p {} ORDER BY {} {}",
        where_clause, safe_sort, sort_dir
    );

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql)?;
    let paper_rows: Vec<(String, String, Option<String>, Option<i32>, Option<String>,
                          Option<String>, Option<String>, String, Option<String>,
                          Option<String>, Option<String>, String, Option<i32>, bool,
                          Option<String>, String, String, String, Option<String>)> =
        stmt.query_map(param_refs.as_slice(), |row| {
            Ok((
                row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
                row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?,
                row.get(10)?, row.get(11)?, row.get(12)?, row.get::<_, i32>(13).map(|v| v != 0)?,
                row.get(14)?, row.get(15)?, row.get(16)?, row.get(17)?, row.get(18)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut papers = Vec::new();
    for row in paper_rows {
        let (id, title, doi, year, journal, abstract_text, pdf_path, source_type,
             short_summary, key_findings_json, paper_type, reading_status, relevance_rating,
             favorite, personal_notes, date_added, date_modified, ai_analysis_status,
             ai_analysis_date) = row;

        let key_findings: Option<Vec<String>> = key_findings_json
            .as_deref()
            .and_then(|j| serde_json::from_str(j).ok());

        let authors = get_paper_authors(conn, &id)?;
        let tags = get_paper_tags(conn, &id)?;
        let project_ids = get_paper_project_ids(conn, &id)?;

        papers.push(Paper {
            id, title, doi, authors, year, journal, abstract_text, pdf_path,
            source_type, short_summary, key_findings, paper_type, reading_status,
            relevance_rating, favorite, personal_notes, date_added, date_modified,
            ai_analysis_status, ai_analysis_date, tags, project_ids,
        });
    }

    Ok(papers)
}

pub fn fetch_paper_by_id(conn: &rusqlite::Connection, id: &str) -> Result<Option<Paper>> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.title, p.doi, p.year, p.journal, p.abstract_text, p.pdf_path,
                p.source_type, p.short_summary, p.key_findings, p.paper_type,
                p.reading_status, p.relevance_rating, p.favorite, p.personal_notes,
                p.date_added, p.date_modified, p.ai_analysis_status, p.ai_analysis_date
         FROM papers p WHERE p.id = ?1"
    )?;

    let result = stmt.query_row([id], |row| {
        Ok((
            row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<i32>>(3)?, row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<String>>(5)?, row.get::<_, Option<String>>(6)?,
            row.get::<_, String>(7)?, row.get::<_, Option<String>>(8)?,
            row.get::<_, Option<String>>(9)?, row.get::<_, Option<String>>(10)?,
            row.get::<_, String>(11)?, row.get::<_, Option<i32>>(12)?,
            row.get::<_, i32>(13).map(|v| v != 0)?,
            row.get::<_, Option<String>>(14)?, row.get::<_, String>(15)?,
            row.get::<_, String>(16)?, row.get::<_, String>(17)?,
            row.get::<_, Option<String>>(18)?,
        ))
    });

    match result {
        Ok((id, title, doi, year, journal, abstract_text, pdf_path, source_type,
            short_summary, key_findings_json, paper_type, reading_status, relevance_rating,
            favorite, personal_notes, date_added, date_modified, ai_analysis_status,
            ai_analysis_date)) => {
            let key_findings: Option<Vec<String>> = key_findings_json
                .as_deref()
                .and_then(|j| serde_json::from_str(j).ok());
            let authors = get_paper_authors(conn, &id)?;
            let tags = get_paper_tags(conn, &id)?;
            let project_ids = get_paper_project_ids(conn, &id)?;
            Ok(Some(Paper {
                id, title, doi, authors, year, journal, abstract_text, pdf_path,
                source_type, short_summary, key_findings, paper_type, reading_status,
                relevance_rating, favorite, personal_notes, date_added, date_modified,
                ai_analysis_status, ai_analysis_date, tags, project_ids,
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn insert_paper(conn: &rusqlite::Connection, input: CreatePaperInput) -> Result<Paper> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let reading_status = input.reading_status.unwrap_or_else(|| "Unread".to_string());
    let ai_status = input.ai_analysis_status.unwrap_or_else(|| "Pending".to_string());
    let key_findings_json = input.key_findings
        .as_ref()
        .map(|kf| serde_json::to_string(kf).unwrap_or_default());

    conn.execute(
        "INSERT INTO papers (id, title, doi, year, journal, abstract_text, pdf_path,
          source_type, short_summary, key_findings, paper_type, reading_status,
          relevance_rating, favorite, personal_notes, date_added, date_modified,
          ai_analysis_status)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16,?17)",
        rusqlite::params![
            id, input.title, input.doi, input.year, input.journal, input.abstract_text,
            input.pdf_path, input.source_type, input.short_summary, key_findings_json,
            input.paper_type, reading_status, input.relevance_rating,
            input.favorite.unwrap_or(false) as i32, input.personal_notes, now, ai_status
        ],
    )?;

    // Insert authors
    upsert_authors(conn, &id, &input.authors)?;

    // Insert tags
    if let Some(tags) = &input.tags {
        for tag_input in tags {
            let tag_id = if let Some(ref tid) = tag_input.tag_id {
                tid.clone()
            } else {
                upsert_tag(conn, &tag_input.tag_name)?
            };
            conn.execute(
                "INSERT OR REPLACE INTO paper_tags (paper_id, tag_id, rating, ai_suggested, user_confirmed, reason)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    id, tag_id, tag_input.rating,
                    tag_input.ai_suggested as i32,
                    tag_input.user_confirmed as i32,
                    tag_input.reason
                ],
            )?;
        }
    }

    // Insert projects
    if let Some(project_ids) = &input.project_ids {
        for project_id in project_ids {
            conn.execute(
                "INSERT OR IGNORE INTO paper_projects (paper_id, project_id) VALUES (?1, ?2)",
                [&id, project_id],
            )?;
        }
    }

    fetch_paper_by_id(conn, &id)?.ok_or_else(|| anyhow::anyhow!("Paper not found after insert"))
}

pub fn update_paper_record(conn: &rusqlite::Connection, input: UpdatePaperInput) -> Result<Paper> {
    let now = Utc::now().to_rfc3339();

    let existing = fetch_paper_by_id(conn, &input.id)?
        .ok_or_else(|| anyhow::anyhow!("Paper not found"))?;

    let key_findings_json = input.key_findings
        .as_ref()
        .map(|kf| serde_json::to_string(kf).unwrap_or_default());

    conn.execute(
        "UPDATE papers SET
          title = COALESCE(?2, title),
          doi = COALESCE(?3, doi),
          year = COALESCE(?4, year),
          journal = COALESCE(?5, journal),
          abstract_text = COALESCE(?6, abstract_text),
          pdf_path = COALESCE(?7, pdf_path),
          paper_type = COALESCE(?8, paper_type),
          reading_status = COALESCE(?9, reading_status),
          relevance_rating = COALESCE(?10, relevance_rating),
          favorite = COALESCE(?11, favorite),
          personal_notes = COALESCE(?12, personal_notes),
          short_summary = COALESCE(?13, short_summary),
          key_findings = COALESCE(?14, key_findings),
          ai_analysis_status = COALESCE(?15, ai_analysis_status),
          ai_analysis_date = COALESCE(?16, ai_analysis_date),
          date_modified = ?17
         WHERE id = ?1",
        rusqlite::params![
            input.id, input.title, input.doi, input.year, input.journal,
            input.abstract_text, input.pdf_path, input.paper_type, input.reading_status,
            input.relevance_rating, input.favorite.map(|f| f as i32),
            input.personal_notes, input.short_summary, key_findings_json,
            input.ai_analysis_status, input.ai_analysis_date, now
        ],
    )?;

    if let Some(ref authors) = input.authors {
        conn.execute("DELETE FROM paper_authors WHERE paper_id = ?1", [&input.id])?;
        upsert_authors(conn, &input.id, authors)?;
    }

    if let Some(ref tags) = input.tags {
        conn.execute("DELETE FROM paper_tags WHERE paper_id = ?1", [&input.id])?;
        for tag_input in tags {
            let tag_id = if let Some(ref tid) = tag_input.tag_id {
                tid.clone()
            } else {
                upsert_tag(conn, &tag_input.tag_name)?
            };
            conn.execute(
                "INSERT OR REPLACE INTO paper_tags (paper_id, tag_id, rating, ai_suggested, user_confirmed, reason)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    input.id, tag_id, tag_input.rating,
                    tag_input.ai_suggested as i32,
                    tag_input.user_confirmed as i32,
                    tag_input.reason
                ],
            )?;
        }
    }

    if let Some(ref project_ids) = input.project_ids {
        conn.execute("DELETE FROM paper_projects WHERE paper_id = ?1", [&input.id])?;
        for project_id in project_ids {
            conn.execute(
                "INSERT OR IGNORE INTO paper_projects (paper_id, project_id) VALUES (?1, ?2)",
                [&input.id, project_id],
            )?;
        }
    }

    let _ = existing;
    fetch_paper_by_id(conn, &input.id)?.ok_or_else(|| anyhow::anyhow!("Paper not found after update"))
}

fn upsert_authors(conn: &rusqlite::Connection, paper_id: &str, authors: &[String]) -> Result<()> {
    for (i, name) in authors.iter().enumerate() {
        let normalized = name.to_lowercase().trim().to_string();
        if normalized.is_empty() { continue; }

        let author_id: String = {
            let result = conn.query_row(
                "SELECT id FROM authors WHERE normalized_name = ?1",
                [&normalized],
                |r| r.get::<_, String>(0),
            );
            match result {
                Ok(id) => id,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    let aid = Uuid::new_v4().to_string();
                    conn.execute(
                        "INSERT INTO authors (id, name, normalized_name) VALUES (?1, ?2, ?3)",
                        rusqlite::params![aid, name, normalized],
                    )?;
                    aid
                }
                Err(e) => return Err(e.into()),
            }
        };

        conn.execute(
            "INSERT OR IGNORE INTO paper_authors (paper_id, author_id, author_order) VALUES (?1, ?2, ?3)",
            rusqlite::params![paper_id, author_id, i as i32],
        )?;
    }
    Ok(())
}

pub fn upsert_tag(conn: &rusqlite::Connection, name: &str) -> Result<String> {
    let normalized = name.to_lowercase().trim().to_string();
    let result = conn.query_row(
        "SELECT id FROM tags WHERE normalized_name = ?1",
        [&normalized],
        |r| r.get::<_, String>(0),
    );
    match result {
        Ok(id) => Ok(id),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            let tag_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO tags (id, name, normalized_name, created_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![tag_id, name, normalized, now],
            )?;
            Ok(tag_id)
        }
        Err(e) => Err(e.into()),
    }
}

pub fn get_paper_authors(conn: &rusqlite::Connection, paper_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT a.name FROM authors a
         JOIN paper_authors pa ON pa.author_id = a.id
         WHERE pa.paper_id = ?1 ORDER BY pa.author_order"
    )?;
    let result: Vec<String> = stmt.query_map([paper_id], |r| r.get(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(result)
}

pub fn get_paper_tags(conn: &rusqlite::Connection, paper_id: &str) -> Result<Vec<PaperTag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, pt.rating, pt.ai_suggested, pt.user_confirmed, pt.reason
         FROM tags t JOIN paper_tags pt ON pt.tag_id = t.id
         WHERE pt.paper_id = ?1 ORDER BY pt.rating DESC"
    )?;
    let result: Vec<PaperTag> = stmt.query_map([paper_id], |r| {
        Ok(PaperTag {
            tag_id: r.get(0)?,
            tag_name: r.get(1)?,
            rating: r.get(2)?,
            ai_suggested: r.get::<_, i32>(3).map(|v| v != 0)?,
            user_confirmed: r.get::<_, i32>(4).map(|v| v != 0)?,
            reason: r.get(5)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(result)
}

pub fn get_paper_project_ids(conn: &rusqlite::Connection, paper_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT project_id FROM paper_projects WHERE paper_id = ?1"
    )?;
    let result: Vec<String> = stmt.query_map([paper_id], |r| r.get(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(result)
}
