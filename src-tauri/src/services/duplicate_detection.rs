use crate::models::paper::DuplicateCandidate;
use rusqlite::Connection;
use anyhow::Result;

pub struct DuplicateChecker<'a> {
    conn: &'a Connection,
}

impl<'a> DuplicateChecker<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn find_duplicates(
        &self,
        doi: Option<&str>,
        title: Option<&str>,
        authors: &[String],
        year: Option<i32>,
        exclude_id: Option<&str>,
    ) -> Result<Vec<DuplicateCandidate>> {
        let mut candidates: Vec<DuplicateCandidate> = Vec::new();

        // 1. Exact DOI match
        if let Some(doi_val) = doi {
            let normalized = normalize_doi(doi_val);
            let mut stmt = self.conn.prepare(
                "SELECT p.id, p.title, p.doi, p.year FROM papers p WHERE p.doi = ?1"
            )?;
            let rows: Vec<(String, String, Option<String>, Option<i32>)> = stmt
                .query_map([&normalized], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
                })?
                .filter_map(|r| r.ok())
                .filter(|(id, _, _, _)| exclude_id.map(|e| e != id).unwrap_or(true))
                .collect();

            for (id, ptitle, pdoi, pyear) in rows {
                let paper_authors = self.get_paper_authors(&id)?;
                candidates.push(DuplicateCandidate {
                    paper_id: id,
                    title: ptitle,
                    authors: paper_authors,
                    year: pyear,
                    doi: pdoi,
                    confidence: 1.0,
                    reason: "Exact DOI match".to_string(),
                });
            }
        }

        // 2. Title similarity check
        if let Some(title_val) = title {
            if candidates.is_empty() {
                let normalized_input = normalize_title(title_val);
                let mut stmt = self.conn.prepare(
                    "SELECT p.id, p.title, p.doi, p.year FROM papers p"
                )?;
                let rows: Vec<(String, String, Option<String>, Option<i32>)> = stmt
                    .query_map([], |row| {
                        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
                    })?
                    .filter_map(|r| r.ok())
                    .filter(|(id, _, _, _)| exclude_id.map(|e| e != id).unwrap_or(true))
                    .collect();

                for (id, ptitle, pdoi, pyear) in rows {
                    let normalized_existing = normalize_title(&ptitle);
                    let sim = title_similarity(&normalized_input, &normalized_existing);

                    if sim >= 0.85 {
                        let paper_authors = self.get_paper_authors(&id)?;
                        let year_matches = year.zip(pyear).map(|(a, b)| a == b).unwrap_or(false);
                        let confidence = if year_matches { (sim * 0.7 + 0.3).min(1.0) } else { sim * 0.7 };

                        if confidence >= 0.6 {
                            candidates.push(DuplicateCandidate {
                                paper_id: id,
                                title: ptitle,
                                authors: paper_authors,
                                year: pyear,
                                doi: pdoi,
                                confidence,
                                reason: format!("Similar title ({:.0}% match)", sim * 100.0),
                            });
                        }
                    }
                }
            }
        }

        // Sort by confidence descending
        candidates.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        candidates.dedup_by(|a, b| a.paper_id == b.paper_id);
        Ok(candidates)
    }

    fn get_paper_authors(&self, paper_id: &str) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT a.name FROM authors a
             JOIN paper_authors pa ON pa.author_id = a.id
             WHERE pa.paper_id = ?1
             ORDER BY pa.author_order"
        )?;
        let names: Vec<String> = stmt
            .query_map([paper_id], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();
        Ok(names)
    }
}

fn normalize_doi(doi: &str) -> String {
    doi.trim()
        .trim_start_matches("https://doi.org/")
        .trim_start_matches("http://doi.org/")
        .trim_start_matches("doi:")
        .to_lowercase()
}

fn normalize_title(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn title_similarity(a: &str, b: &str) -> f64 {
    if a == b { return 1.0; }
    if a.is_empty() || b.is_empty() { return 0.0; }

    let words_a: std::collections::HashSet<&str> = a.split_whitespace().collect();
    let words_b: std::collections::HashSet<&str> = b.split_whitespace().collect();
    let intersection = words_a.intersection(&words_b).count();
    let union = words_a.union(&words_b).count();

    if union == 0 { return 0.0; }
    intersection as f64 / union as f64
}
