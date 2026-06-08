use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub normalized_name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub paper_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarTagWarning {
    pub existing_tag_id: String,
    pub existing_tag_name: String,
    pub similarity_score: f64,
}
