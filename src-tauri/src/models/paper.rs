use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paper {
    pub id: String,
    pub title: String,
    pub doi: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub pdf_path: Option<String>,
    pub source_type: String,
    pub short_summary: Option<String>,
    pub key_findings: Option<Vec<String>>,
    pub paper_type: Option<String>,
    pub reading_status: String,
    pub relevance_rating: Option<i32>,
    pub favorite: bool,
    pub personal_notes: Option<String>,
    pub date_added: String,
    pub date_modified: String,
    pub ai_analysis_status: String,
    pub ai_analysis_date: Option<String>,
    pub tags: Vec<PaperTag>,
    pub project_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperTag {
    pub tag_id: String,
    pub tag_name: String,
    pub rating: i32,
    pub ai_suggested: bool,
    pub user_confirmed: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaperInput {
    pub title: String,
    pub doi: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub pdf_path: Option<String>,
    pub source_type: String,
    pub paper_type: Option<String>,
    pub reading_status: Option<String>,
    pub relevance_rating: Option<i32>,
    pub favorite: Option<bool>,
    pub personal_notes: Option<String>,
    pub short_summary: Option<String>,
    pub key_findings: Option<Vec<String>>,
    pub tags: Option<Vec<TagInput>>,
    pub project_ids: Option<Vec<String>>,
    pub ai_analysis_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagInput {
    pub tag_id: Option<String>,
    pub tag_name: String,
    pub rating: i32,
    pub ai_suggested: bool,
    pub user_confirmed: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePaperInput {
    pub id: String,
    pub title: Option<String>,
    pub doi: Option<String>,
    pub authors: Option<Vec<String>>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub pdf_path: Option<String>,
    pub paper_type: Option<String>,
    pub reading_status: Option<String>,
    pub relevance_rating: Option<i32>,
    pub favorite: Option<bool>,
    pub personal_notes: Option<String>,
    pub short_summary: Option<String>,
    pub key_findings: Option<Vec<String>>,
    pub tags: Option<Vec<TagInput>>,
    pub project_ids: Option<Vec<String>>,
    pub ai_analysis_status: Option<String>,
    pub ai_analysis_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperFilter {
    pub project_id: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    pub reading_status: Option<Vec<String>>,
    pub paper_type: Option<Vec<String>>,
    pub year_from: Option<i32>,
    pub year_to: Option<i32>,
    pub relevance_min: Option<i32>,
    pub relevance_max: Option<i32>,
    pub favorite_only: Option<bool>,
    pub search_query: Option<String>,
    pub sort_by: Option<String>,
    pub sort_desc: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportPreview {
    pub title: Option<String>,
    pub doi: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub missing_fields: Vec<String>,
    pub uncertain_fields: Vec<String>,
    pub duplicate_candidates: Vec<DuplicateCandidate>,
    pub source_type: String,
    pub pdf_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateCandidate {
    pub paper_id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub doi: Option<String>,
    pub confidence: f64,
    pub reason: String,
}
