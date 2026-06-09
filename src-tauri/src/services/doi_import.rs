use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct CrossrefWork {
    #[serde(rename = "DOI")]
    doi: Option<String>,
    title: Option<Vec<String>>,
    author: Option<Vec<CrossrefAuthor>>,
    #[serde(rename = "published-print")]
    published_print: Option<CrossrefDate>,
    #[serde(rename = "published-online")]
    published_online: Option<CrossrefDate>,
    #[serde(rename = "container-title")]
    container_title: Option<Vec<String>>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CrossrefAuthor {
    given: Option<String>,
    family: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CrossrefDate {
    #[serde(rename = "date-parts")]
    date_parts: Option<Vec<Vec<Option<i32>>>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CrossrefResponse {
    message: CrossrefWork,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DoiMetadata {
    pub title: Option<String>,
    pub doi: String,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub missing_fields: Vec<String>,
    pub uncertain_fields: Vec<String>,
}

pub async fn fetch_doi_metadata(doi: &str) -> Result<DoiMetadata> {
    let normalized_doi = normalize_doi(doi);
    let url = format!("https://api.crossref.org/works/{}", urlencoding(&normalized_doi));

    let client = reqwest::Client::builder()
        .user_agent("ResearchLab/1.0 (mailto:user@researchlab.app)")
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| anyhow!("Network error fetching DOI metadata: {}", e))?;

    if !response.status().is_success() {
        if response.status().as_u16() == 404 {
            return Err(anyhow!("DOI not found. Please check the DOI or create the paper manually."));
        }
        return Err(anyhow!("Failed to fetch DOI metadata: HTTP {}", response.status()));
    }

    let cr: CrossrefResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse Crossref response: {}", e))?;

    let work = cr.message;

    let title = work.title.and_then(|t| t.into_iter().next());
    let authors: Vec<String> = work
        .author
        .unwrap_or_default()
        .into_iter()
        .map(|a| {
            match (a.given, a.family) {
                (Some(g), Some(f)) => format!("{} {}", g, f),
                (None, Some(f)) => f,
                (Some(g), None) => g,
                (None, None) => String::new(),
            }
        })
        .filter(|s| !s.is_empty())
        .collect();

    let year = work
        .published_print
        .or(work.published_online)
        .and_then(|d| d.date_parts)
        .and_then(|dp| dp.into_iter().next())
        .and_then(|parts| parts.into_iter().next())
        .flatten();

    let journal = work
        .container_title
        .and_then(|ct| ct.into_iter().next());

    let abstract_text = work.abstract_text.map(|a| clean_abstract(&a));

    let mut missing_fields = Vec::new();
    let mut uncertain_fields = Vec::new();

    if title.is_none() { missing_fields.push("Title".to_string()); }
    if authors.is_empty() { missing_fields.push("Authors".to_string()); }
    if year.is_none() { missing_fields.push("Year".to_string()); }
    if journal.is_none() { uncertain_fields.push("Journal".to_string()); }
    if abstract_text.is_none() { uncertain_fields.push("Abstract".to_string()); }

    Ok(DoiMetadata {
        title,
        doi: normalized_doi,
        authors,
        year,
        journal,
        abstract_text,
        missing_fields,
        uncertain_fields,
    })
}

fn normalize_doi(doi: &str) -> String {
    let doi = doi.trim();
    if let Some(stripped) = doi.strip_prefix("https://doi.org/") {
        return stripped.to_string();
    }
    if let Some(stripped) = doi.strip_prefix("http://doi.org/") {
        return stripped.to_string();
    }
    if let Some(stripped) = doi.strip_prefix("doi:") {
        return stripped.to_string();
    }
    doi.to_string()
}

fn clean_abstract(text: &str) -> String {
    let re = regex::Regex::new(r"<[^>]+>").unwrap();
    re.replace_all(text, "").trim().to_string()
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            ' ' => "%20".to_string(),
            _ => c.to_string(),
        })
        .collect()
}
