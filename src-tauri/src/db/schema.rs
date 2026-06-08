use anyhow::Result;
use rusqlite::Connection;

pub fn initialize_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            doi TEXT,
            year INTEGER,
            journal TEXT,
            abstract_text TEXT,
            pdf_path TEXT,
            source_type TEXT NOT NULL DEFAULT 'Manual',
            short_summary TEXT,
            key_findings TEXT,
            paper_type TEXT,
            reading_status TEXT NOT NULL DEFAULT 'Unread',
            relevance_rating INTEGER,
            favorite INTEGER NOT NULL DEFAULT 0,
            personal_notes TEXT,
            date_added TEXT NOT NULL,
            date_modified TEXT NOT NULL,
            ai_analysis_status TEXT NOT NULL DEFAULT 'Pending',
            ai_analysis_date TEXT
        );

        CREATE TABLE IF NOT EXISTS authors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            normalized_name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS paper_authors (
            paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
            author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
            author_order INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (paper_id, author_id)
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            normalized_name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS paper_tags (
            paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL DEFAULT 3,
            ai_suggested INTEGER NOT NULL DEFAULT 0,
            user_confirmed INTEGER NOT NULL DEFAULT 0,
            reason TEXT,
            PRIMARY KEY (paper_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS paper_projects (
            paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            PRIMARY KEY (paper_id, project_id)
        );

        CREATE TABLE IF NOT EXISTS insights (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            analysis_type TEXT NOT NULL,
            result TEXT NOT NULL,
            used_filters TEXT,
            used_paper_ids TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS suggested_papers (
            id TEXT PRIMARY KEY,
            topic_tag_id TEXT NOT NULL,
            title TEXT NOT NULL,
            doi TEXT,
            authors TEXT NOT NULL DEFAULT '[]',
            year INTEGER,
            journal TEXT,
            abstract_text TEXT,
            source TEXT NOT NULL,
            relevance_reason TEXT,
            relevance_score REAL,
            status TEXT NOT NULL DEFAULT 'New',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS import_logs (
            id TEXT PRIMARY KEY,
            paper_id TEXT REFERENCES papers(id) ON DELETE SET NULL,
            import_type TEXT NOT NULL,
            status TEXT NOT NULL,
            missing_fields TEXT,
            uncertain_fields TEXT,
            duplicate_candidates TEXT,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi);
        CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
        CREATE INDEX IF NOT EXISTS idx_papers_reading_status ON papers(reading_status);
        CREATE INDEX IF NOT EXISTS idx_papers_paper_type ON papers(paper_type);
        CREATE INDEX IF NOT EXISTS idx_papers_date_added ON papers(date_added);
        CREATE INDEX IF NOT EXISTS idx_paper_tags_tag_id ON paper_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_paper_projects_project_id ON paper_projects(project_id);
        CREATE INDEX IF NOT EXISTS idx_suggested_papers_topic ON suggested_papers(topic_tag_id);
        CREATE INDEX IF NOT EXISTS idx_suggested_papers_status ON suggested_papers(status);
    "#)?;
    Ok(())
}
