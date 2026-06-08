use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsData {
    pub papers_per_year: Vec<YearCount>,
    pub papers_per_topic: Vec<TopicCount>,
    pub papers_by_reading_status: Vec<StatusCount>,
    pub papers_by_type: Vec<TypeCount>,
    pub relevance_distribution: Vec<RelevanceCount>,
    pub topic_avg_rating: Vec<TopicRating>,
    pub topic_development: Vec<TopicYearCount>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YearCount { pub year: i32, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct TopicCount { pub tag_name: String, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCount { pub status: String, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct TypeCount { pub paper_type: String, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct RelevanceCount { pub rating: i32, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct TopicRating { pub tag_name: String, pub avg_rating: f64, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct TopicYearCount { pub tag_name: String, pub year: i32, pub count: i64 }

fn query_collect<T, F>(conn: &rusqlite::Connection, sql: &str, f: F) -> Result<Vec<T>>
where
    F: Fn(&rusqlite::Row) -> rusqlite::Result<T>,
{
    let mut stmt = conn.prepare(sql)?;
    let rows: Vec<T> = stmt.query_map([], f)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub async fn get_analytics(project_id: Option<String>, state: State<'_, AppState>) -> Result<AnalyticsData, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let project_filter = match project_id.as_deref() {
        Some("all") | None => None,
        Some(pid) => Some(pid.to_string()),
    };

    let base_where = if let Some(ref pid) = project_filter {
        format!("EXISTS (SELECT 1 FROM paper_projects pp WHERE pp.paper_id = p.id AND pp.project_id = '{}')", pid)
    } else {
        "1=1".to_string()
    };

    let papers_per_year = {
        let sql = format!(
            "SELECT year, COUNT(*) as count FROM papers p WHERE year IS NOT NULL AND {} GROUP BY year ORDER BY year",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(YearCount { year: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?
    };

    let papers_per_topic = {
        let sql = format!(
            "SELECT t.name, COUNT(DISTINCT pt.paper_id) as count
             FROM tags t JOIN paper_tags pt ON pt.tag_id = t.id
             JOIN papers p ON p.id = pt.paper_id
             WHERE {} GROUP BY t.id ORDER BY count DESC LIMIT 15",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(TopicCount { tag_name: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?
    };

    let papers_by_reading_status = {
        let sql = format!(
            "SELECT reading_status, COUNT(*) as count FROM papers p WHERE {} GROUP BY reading_status",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(StatusCount { status: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?
    };

    let papers_by_type = {
        let sql = format!(
            "SELECT COALESCE(paper_type, 'Unknown') as paper_type, COUNT(*) as count FROM papers p WHERE {} GROUP BY paper_type",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(TypeCount { paper_type: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?
    };

    let relevance_distribution = {
        let sql = format!(
            "SELECT relevance_rating, COUNT(*) as count FROM papers p WHERE relevance_rating IS NOT NULL AND {} GROUP BY relevance_rating ORDER BY relevance_rating",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(RelevanceCount { rating: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?
    };

    let topic_avg_rating = {
        let sql = format!(
            "SELECT t.name, AVG(pt.rating) as avg_rating, COUNT(DISTINCT pt.paper_id) as count
             FROM tags t JOIN paper_tags pt ON pt.tag_id = t.id
             JOIN papers p ON p.id = pt.paper_id
             WHERE {} GROUP BY t.id ORDER BY avg_rating DESC LIMIT 15",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(TopicRating {
            tag_name: r.get(0)?,
            avg_rating: r.get(1)?,
            count: r.get(2)?,
        })).map_err(|e| e.to_string())?
    };

    let topic_development = {
        let sql = format!(
            "SELECT t.name, p.year, COUNT(*) as count
             FROM tags t JOIN paper_tags pt ON pt.tag_id = t.id
             JOIN papers p ON p.id = pt.paper_id
             WHERE p.year IS NOT NULL AND {}
             GROUP BY t.id, p.year ORDER BY p.year, count DESC",
            base_where
        );
        query_collect(&conn, &sql, |r| Ok(TopicYearCount {
            tag_name: r.get(0)?,
            year: r.get(1)?,
            count: r.get(2)?,
        })).map_err(|e| e.to_string())?
    };

    Ok(AnalyticsData {
        papers_per_year,
        papers_per_topic,
        papers_by_reading_status,
        papers_by_type,
        relevance_distribution,
        topic_avg_rating,
        topic_development,
    })
}
