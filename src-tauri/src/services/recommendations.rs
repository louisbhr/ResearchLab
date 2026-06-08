use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use crate::models::suggested_paper::SuggestedPaper;

#[derive(Debug, Deserialize)]
struct OpenAlexWork {
    id: Option<String>,
    title: Option<String>,
    doi: Option<String>,
    publication_year: Option<i32>,
    #[serde(rename = "primary_location")]
    primary_location: Option<OpenAlexLocation>,
    authorships: Option<Vec<OpenAlexAuthorship>>,
    #[serde(rename = "abstract_inverted_index")]
    abstract_inverted_index: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct OpenAlexLocation {
    source: Option<OpenAlexSource>,
}

#[derive(Debug, Deserialize)]
struct OpenAlexSource {
    display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAlexAuthorship {
    author: Option<OpenAlexAuthor>,
}

#[derive(Debug, Deserialize)]
struct OpenAlexAuthor {
    display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAlexResponse {
    results: Vec<OpenAlexWork>,
}

#[derive(Debug, Deserialize)]
struct CrossrefItem {
    title: Option<Vec<String>>,
    #[serde(rename = "DOI")]
    doi: Option<String>,
    author: Option<Vec<CrossrefAuthor>>,
    #[serde(rename = "published-print")]
    published_print: Option<CrossrefDate>,
    #[serde(rename = "published-online")]
    published_online: Option<CrossrefDate>,
    #[serde(rename = "container-title")]
    container_title: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CrossrefAuthor {
    given: Option<String>,
    family: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CrossrefDate {
    #[serde(rename = "date-parts")]
    date_parts: Option<Vec<Vec<Option<i32>>>>,
}

#[derive(Debug, Deserialize)]
struct CrossrefMessage {
    items: Vec<CrossrefItem>,
}

#[derive(Debug, Deserialize)]
struct CrossrefSearchResponse {
    message: CrossrefMessage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawRecommendation {
    pub title: String,
    pub doi: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    pub journal: Option<String>,
    pub abstract_text: Option<String>,
    pub source: String,
}

pub async fn search_openalex(query: &str) -> Result<Vec<RawRecommendation>> {
    let encoded = encode_query(query);
    let url = format!(
        "https://api.openalex.org/works?search={}&per-page=10&sort=relevance_score:desc&mailto=user@researchlab.app",
        encoded
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| anyhow!("OpenAlex request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(anyhow!("OpenAlex returned HTTP {}", resp.status()));
    }

    let data: OpenAlexResponse = resp.json().await
        .map_err(|e| anyhow!("Failed to parse OpenAlex response: {}", e))?;

    let results = data
        .results
        .into_iter()
        .filter_map(|work| {
            let title = work.title?;
            let authors: Vec<String> = work
                .authorships
                .unwrap_or_default()
                .into_iter()
                .filter_map(|a| a.author?.display_name)
                .take(5)
                .collect();

            let journal = work
                .primary_location
                .and_then(|loc| loc.source)
                .and_then(|src| src.display_name);

            let doi = work.doi.map(|d| {
                d.trim_start_matches("https://doi.org/").to_string()
            });

            Some(RawRecommendation {
                title,
                doi,
                authors,
                year: work.publication_year,
                journal,
                abstract_text: None,
                source: "OpenAlex".to_string(),
            })
        })
        .collect();

    Ok(results)
}

pub async fn search_crossref(query: &str) -> Result<Vec<RawRecommendation>> {
    let encoded = encode_query(query);
    let url = format!(
        "https://api.crossref.org/works?query={}&rows=10&sort=relevance",
        encoded
    );

    let client = reqwest::Client::builder()
        .user_agent("ResearchLab/1.0 (mailto:user@researchlab.app)")
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| anyhow!("Crossref request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(anyhow!("Crossref returned HTTP {}", resp.status()));
    }

    let data: CrossrefSearchResponse = resp.json().await
        .map_err(|e| anyhow!("Failed to parse Crossref response: {}", e))?;

    let results = data
        .message
        .items
        .into_iter()
        .filter_map(|item| {
            let title = item.title?.into_iter().next()?;
            let authors: Vec<String> = item
                .author
                .unwrap_or_default()
                .into_iter()
                .map(|a| match (a.given, a.family) {
                    (Some(g), Some(f)) => format!("{} {}", g, f),
                    (None, Some(f)) => f,
                    (Some(g), None) => g,
                    _ => String::new(),
                })
                .filter(|s| !s.is_empty())
                .take(5)
                .collect();

            let year = item
                .published_print
                .or(item.published_online)
                .and_then(|d| d.date_parts)
                .and_then(|dp| dp.into_iter().next())
                .and_then(|parts| parts.into_iter().next())
                .flatten();

            let journal = item
                .container_title
                .and_then(|ct| ct.into_iter().next());

            Some(RawRecommendation {
                title,
                doi: item.doi,
                authors,
                year,
                journal,
                abstract_text: None,
                source: "Crossref".to_string(),
            })
        })
        .collect();

    Ok(results)
}

fn encode_query(q: &str) -> String {
    q.chars()
        .map(|c| match c {
            ' ' => '+',
            _ => c,
        })
        .collect()
}
