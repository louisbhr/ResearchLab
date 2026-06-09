use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Insight {
    pub id: String,
    pub title: String,
    pub analysis_type: String,
    pub result: String,
    pub used_filters: Option<String>,
    pub used_paper_ids: Vec<String>,
    pub created_at: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInsightInput {
    pub title: String,
    pub analysis_type: String,
    pub result: String,
    pub used_filters: Option<String>,
    pub used_paper_ids: Vec<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsightFilter {
    pub analysis_type: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    pub paper_ids: Option<Vec<String>>,
}
