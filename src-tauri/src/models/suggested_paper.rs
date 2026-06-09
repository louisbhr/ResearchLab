use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedPaper {
    pub id: String,
    pub topic_tag_id: String,
    pub title: String,
    pub doi: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub source: String,
    pub relevance_reason: Option<String>,
    pub relevance_score: Option<f64>,
    pub status: String,
    pub created_at: String,
    pub abstract_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSuggestedPaperStatus {
    pub id: String,
    pub status: String,
}
