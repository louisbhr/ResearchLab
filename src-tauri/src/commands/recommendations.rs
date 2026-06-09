use tauri::State;
use crate::AppState;
use crate::models::suggested_paper::*;
use crate::services::recommendations as rec_service;
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;

#[tauri::command]
pub async fn find_papers_for_topic(
    tag_id: String,
    tag_name: String,
    topic_summary: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SuggestedPaper>, String> {
    // Build search query
    let query = if let Some(ref summary) = topic_summary {
        format!("{} {}", tag_name, extract_key_terms(summary))
    } else {
        tag_name.clone()
    };

    // Fetch from both sources concurrently
    let (openalex_result, crossref_result) = tokio::join!(
        rec_service::search_openalex(&query),
        rec_service::search_crossref(&query)
    );

    let mut all_results = Vec::new();

    if let Ok(results) = openalex_result {
        all_results.extend(results);
    }
    if let Ok(results) = crossref_result {
        all_results.extend(results);
    }

    // Deduplicate by DOI
    let mut seen_dois: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut unique_results = Vec::new();
    for r in all_results {
        if let Some(ref doi) = r.doi {
            if !seen_dois.insert(doi.clone()) { continue; }
        }
        unique_results.push(r);
    }

    // Check against existing library and store results
    let now = Utc::now().to_rfc3339();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let existing_dois: std::collections::HashSet<String> = {
        let mut stmt = conn.prepare("SELECT doi FROM papers WHERE doi IS NOT NULL")
            .map_err(|e| e.to_string())?;
        let collected: Vec<String> = stmt.query_map([], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        collected.into_iter().collect()
    };

    let mut suggested = Vec::new();
    for raw in unique_results.iter().take(20) {
        let status = if raw.doi.as_ref().map(|d| existing_dois.contains(d)).unwrap_or(false) {
            "Already in Library"
        } else {
            "New"
        };

        let id = Uuid::new_v4().to_string();
        let authors_json = serde_json::to_string(&raw.authors).unwrap_or_default();

        conn.execute(
            "INSERT OR IGNORE INTO suggested_papers
             (id, topic_tag_id, title, doi, authors, year, journal, abstract_text, source, status, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            rusqlite::params![
                id, tag_id, raw.title, raw.doi, authors_json, raw.year, raw.journal,
                raw.abstract_text, raw.source, status, now
            ],
        ).ok();

        suggested.push(SuggestedPaper {
            id,
            topic_tag_id: tag_id.clone(),
            title: raw.title.clone(),
            doi: raw.doi.clone(),
            authors: raw.authors.clone(),
            year: raw.year,
            journal: raw.journal.clone(),
            abstract_text: raw.abstract_text.clone(),
            source: raw.source.clone(),
            relevance_reason: None,
            relevance_score: None,
            status: status.to_string(),
            created_at: now.clone(),
        });
    }

    Ok(suggested)
}

#[tauri::command]
pub async fn get_suggested_papers(
    tag_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<SuggestedPaper>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, topic_tag_id, title, doi, authors, year, journal, abstract_text,
                source, relevance_reason, relevance_score, status, created_at
         FROM suggested_papers WHERE topic_tag_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let result: Vec<SuggestedPaper> = stmt.query_map([&tag_id], |r| {
        let authors_json: String = r.get(4)?;
        let authors: Vec<String> = serde_json::from_str(&authors_json).unwrap_or_default();
        Ok(SuggestedPaper {
            id: r.get(0)?,
            topic_tag_id: r.get(1)?,
            title: r.get(2)?,
            doi: r.get(3)?,
            authors,
            year: r.get(5)?,
            journal: r.get(6)?,
            abstract_text: r.get(7)?,
            source: r.get(8)?,
            relevance_reason: r.get(9)?,
            relevance_score: r.get(10)?,
            status: r.get(11)?,
            created_at: r.get(12)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(result)
}

#[tauri::command]
pub async fn update_suggested_paper_status(
    input: UpdateSuggestedPaperStatus,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE suggested_papers SET status = ?2 WHERE id = ?1",
        [&input.id, &input.status],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn extract_key_terms(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace()
        .filter(|w| w.len() > 4)
        .take(5)
        .collect();
    words.join(" ")
}
