// ─────────────────────────────────────────────────────────────────────────────
// Core domain models – mirror the Rust structs so serde round-trips cleanly
// ─────────────────────────────────────────────────────────────────────────────

export interface PaperTag {
  tag_id: string;
  tag_name: string;
  rating: number;
  ai_suggested: boolean;
  user_confirmed: boolean;
  reason?: string | null;
}

export interface Paper {
  id: string;
  title: string;
  doi?: string | null;
  authors: string[];
  year?: number | null;
  journal?: string | null;
  abstract_text?: string | null;
  pdf_path?: string | null;
  source_type: string;
  short_summary?: string | null;
  key_findings?: string[] | null;
  paper_type?: string | null;
  reading_status: string;
  relevance_rating?: number | null;
  favorite: boolean;
  personal_notes?: string | null;
  date_added: string;
  date_modified: string;
  ai_analysis_status: string;
  ai_analysis_date?: string | null;
  tags: PaperTag[];
  project_ids: string[];
}

export interface Tag {
  id: string;
  name: string;
  normalized_name: string;
  description?: string | null;
  created_at: string;
  paper_count?: number | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  paper_count?: number | null;
}

export interface Insight {
  id: string;
  title: string;
  analysis_type: string;
  created_at: string;
  result: string;
  used_filters?: string | null;
  used_paper_ids: string[];
  notes?: string | null;
}

export interface SuggestedPaper {
  id: string;
  topic_tag_id: string;
  title: string;
  doi?: string | null;
  authors: string[];
  year?: number | null;
  journal?: string | null;
  abstract_text?: string | null;
  source: string;
  relevance_reason?: string | null;
  relevance_score?: number | null;
  status: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Import / duplicate detection
// ─────────────────────────────────────────────────────────────────────────────

export interface DuplicateCandidate {
  paper_id: string;
  title: string;
  authors: string[];
  year?: number | null;
  doi?: string | null;
  confidence: number;
  reason: string;
}

export interface ImportPreview {
  title?: string | null;
  doi?: string | null;
  authors: string[];
  year?: number | null;
  journal?: string | null;
  abstract_text?: string | null;
  missing_fields: string[];
  uncertain_fields: string[];
  duplicate_candidates: DuplicateCandidate[];
  source_type: string;
  pdf_path?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtering / sorting
// ─────────────────────────────────────────────────────────────────────────────

export interface PaperFilter {
  project_id?: string | null;
  tag_ids?: string[] | null;
  reading_status?: string[] | null;
  paper_type?: string[] | null;
  year_from?: number | null;
  year_to?: number | null;
  relevance_min?: number | null;
  relevance_max?: number | null;
  favorite_only?: boolean | null;
  search_query?: string | null;
  sort_by?: string | null;
  sort_desc?: boolean | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics – mirror the Rust analytics command structs
// ─────────────────────────────────────────────────────────────────────────────

export interface YearCount {
  year: number;
  count: number;
}

export interface TopicCount {
  tag_name: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TypeCount {
  paper_type: string;
  count: number;
}

export interface RelevanceCount {
  rating: number;
  count: number;
}

export interface TopicRating {
  tag_name: string;
  avg_rating: number;
  count: number;
}

export interface TopicYearCount {
  tag_name: string;
  year: number;
  count: number;
}

export interface AnalyticsData {
  papers_per_year: YearCount[];
  papers_per_topic: TopicCount[];
  papers_by_reading_status: StatusCount[];
  papers_by_type: TypeCount[];
  relevance_distribution: RelevanceCount[];
  topic_avg_rating: TopicRating[];
  topic_development: TopicYearCount[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface AppSettings {
  claude_api_key_set: boolean;
  claude_model: string;
  pdf_storage_path: string;
  db_path: string;
  theme: string;
  app_version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backup
// ─────────────────────────────────────────────────────────────────────────────

export interface BackupManifest {
  version: string;
  created_at: string;
  includes_pdfs: boolean;
  paper_count: number;
  tag_count: number;
  project_count: number;
  insight_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI analysis
// ─────────────────────────────────────────────────────────────────────────────

export interface AIAnalysisTag {
  name: string;
  rating: number;
  reason: string;
  isExistingTag: boolean;
}

export interface AIAnalysisResult {
  shortSummary: string;
  keyFindings: string[];
  paperType: string;
  tags: AIAnalysisTag[];
  relevanceSuggestion: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inputs forwarded to the backend
// ─────────────────────────────────────────────────────────────────────────────

export interface TagInput {
  tag_id?: string | null;
  tag_name: string;
  rating: number;
  ai_suggested: boolean;
  user_confirmed: boolean;
  reason?: string | null;
}

export interface CreatePaperInput {
  title: string;
  doi?: string | null;
  authors: string[];
  year?: number | null;
  journal?: string | null;
  abstract_text?: string | null;
  pdf_path?: string | null;
  source_type: string;
  paper_type?: string | null;
  reading_status?: string | null;
  relevance_rating?: number | null;
  favorite?: boolean | null;
  personal_notes?: string | null;
  short_summary?: string | null;
  key_findings?: string[] | null;
  tags?: TagInput[] | null;
  project_ids?: string[] | null;
  ai_analysis_status?: string | null;
}

export interface UpdatePaperInput {
  id: string;
  title?: string | null;
  doi?: string | null;
  authors?: string[] | null;
  year?: number | null;
  journal?: string | null;
  abstract_text?: string | null;
  pdf_path?: string | null;
  paper_type?: string | null;
  reading_status?: string | null;
  relevance_rating?: number | null;
  favorite?: boolean | null;
  personal_notes?: string | null;
  short_summary?: string | null;
  key_findings?: string[] | null;
  tags?: TagInput[] | null;
  project_ids?: string[] | null;
  ai_analysis_status?: string | null;
  ai_analysis_date?: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  id: string;
  name?: string | null;
  description?: string | null;
}

export interface CreateInsightInput {
  title: string;
  analysis_type: string;
  result: string;
  used_filters?: string | null;
  used_paper_ids: string[];
  notes?: string | null;
}

export interface CreateTagInput {
  name: string;
  description?: string | null;
}

export interface SimilarTagWarning {
  existing_tag_id: string;
  existing_tag_name: string;
  similarity_score: number;
}

export interface UpdateSuggestedPaperStatus {
  id: string;
  status: string;
}

export interface InsightFilter {
  analysis_type?: string | null;
  tag_ids?: string[] | null;
  paper_ids?: string[] | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const READING_STATUSES = ['Unread', 'In Progress', 'Read'] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const PAPER_TYPES = [
  'Empirical Study',
  'Review / Survey',
  'Meta-Analysis',
  'Theoretical',
  'Methodology',
  'Case Study',
  'Technical Report',
  'Conference Paper',
  'Book Chapter',
  'Preprint',
  'Other',
] as const;
export type PaperType = (typeof PAPER_TYPES)[number];

export const ANALYSIS_TYPES = [
  'Topic Clustering',
  'Paper Comparison',
  'Research Overview',
  'Research Gaps',
  'Contradiction Detection',
  'Similar Papers',
] as const;
export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

export const SORT_OPTIONS = [
  { value: 'date_added', label: 'Date Added' },
  { value: 'date_modified', label: 'Date Modified' },
  { value: 'year', label: 'Year' },
  { value: 'title', label: 'Title' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'reading_status', label: 'Reading Status' },
  { value: 'paper_type', label: 'Paper Type' },
] as const;

export const AI_ANALYSIS_STATUSES = ['Pending', 'Complete', 'Failed', 'Skipped'] as const;
export type AIAnalysisStatus = (typeof AI_ANALYSIS_STATUSES)[number];

export const SOURCE_TYPES = ['DOI', 'PDF', 'Manual'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SUGGESTED_PAPER_STATUSES = [
  'New',
  'Already in Library',
  'Dismissed',
  'Queued for Import',
] as const;
export type SuggestedPaperStatus = (typeof SUGGESTED_PAPER_STATUSES)[number];
