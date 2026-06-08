import { invoke } from '@tauri-apps/api/core';
import type {
  Paper,
  PaperFilter,
  CreatePaperInput,
  UpdatePaperInput,
  ImportPreview,
  DuplicateCandidate,
  Tag,
  CreateTagInput,
  SimilarTagWarning,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Insight,
  InsightFilter,
  CreateInsightInput,
  AppSettings,
  BackupManifest,
  AnalyticsData,
  SuggestedPaper,
  UpdateSuggestedPaperStatus,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Papers
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all papers, optionally filtered/sorted. */
export async function getPapers(filter?: PaperFilter): Promise<Paper[]> {
  return invoke<Paper[]>('get_papers', { filter: filter ?? null });
}

/** Fetch a single paper by its UUID. Returns null when not found. */
export async function getPaper(id: string): Promise<Paper | null> {
  return invoke<Paper | null>('get_paper', { id });
}

/** Insert a new paper record. */
export async function createPaper(input: CreatePaperInput): Promise<Paper> {
  return invoke<Paper>('create_paper', { input });
}

/** Patch an existing paper. Only supplied fields are updated. */
export async function updatePaper(input: UpdatePaperInput): Promise<Paper> {
  return invoke<Paper>('update_paper', { input });
}

/** Permanently remove a paper and its relations. */
export async function deletePaper(id: string): Promise<void> {
  return invoke<void>('delete_paper', { id });
}

/** Return the total number of papers in the database. */
export async function getPaperCount(): Promise<number> {
  return invoke<number>('get_paper_count');
}

// ─────────────────────────────────────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a DOI via Crossref/OpenAlex and return a preview with duplicate
 * detection already run against the local library.
 */
export async function fetchDoiPreview(doi: string): Promise<ImportPreview> {
  return invoke<ImportPreview>('fetch_doi_preview', { doi });
}

/**
 * Copy a PDF to app storage and attempt to extract metadata from it.
 * Returns a partially-filled ImportPreview; the user fills in the blanks.
 */
export async function parsePdf(pdfPath: string): Promise<ImportPreview> {
  return invoke<ImportPreview>('parse_pdf', { pdfPath });
}

/**
 * Run duplicate detection for the given metadata combination.
 * Pass excludeId to skip the paper being edited.
 */
export async function checkDuplicates(
  doi?: string | null,
  title?: string | null,
  authors?: string[],
  year?: number | null,
  excludeId?: string | null,
): Promise<DuplicateCandidate[]> {
  return invoke<DuplicateCandidate[]>('check_duplicates', {
    doi: doi ?? null,
    title: title ?? null,
    authors: authors ?? [],
    year: year ?? null,
    excludeId: excludeId ?? null,
  });
}

/** Open the PDF stored at a relative path (e.g. "pdfs/<uuid>_file.pdf") with the OS viewer. */
export async function openPdf(relativePath: string): Promise<void> {
  return invoke<void>('open_pdf', { relativePath });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all tags ordered by paper count descending. */
export async function getTags(): Promise<Tag[]> {
  return invoke<Tag[]>('get_tags');
}

/** Create a new tag. Throws if a tag with the same normalised name already exists. */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  return invoke<Tag>('create_tag', { input });
}

/** Delete a tag and remove all paper_tags relationships. */
export async function deleteTag(id: string): Promise<void> {
  return invoke<void>('delete_tag', { id });
}

/** Return tags whose normalised name is suspiciously similar to the given name. */
export async function checkSimilarTags(name: string): Promise<SimilarTagWarning[]> {
  return invoke<SimilarTagWarning[]>('check_similar_tags', { name });
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all projects ordered by creation date. */
export async function getProjects(): Promise<Project[]> {
  return invoke<Project[]>('get_projects');
}

/** Create a new project. */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  return invoke<Project>('create_project', { input });
}

/** Rename or update the description of an existing project. */
export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  return invoke<Project>('update_project', { input });
}

/** Delete a project and remove all paper_projects relationships. */
export async function deleteProject(id: string): Promise<void> {
  return invoke<void>('delete_project', { id });
}

// ─────────────────────────────────────────────────────────────────────────────
// Insights
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all saved insights, optionally filtered by analysis type. */
export async function getInsights(filter?: InsightFilter): Promise<Insight[]> {
  return invoke<Insight[]>('get_insights', { filter: filter ?? null });
}

/** Fetch a single insight by ID. Returns null when not found. */
export async function getInsight(id: string): Promise<Insight | null> {
  return invoke<Insight | null>('get_insight', { id });
}

/** Persist a new insight. */
export async function createInsight(input: CreateInsightInput): Promise<Insight> {
  return invoke<Insight>('create_insight', { input });
}

/** Permanently remove an insight. */
export async function deleteInsight(id: string): Promise<void> {
  return invoke<void>('delete_insight', { id });
}

/** Update only the freeform notes on an existing insight. */
export async function updateInsightNotes(id: string, notes: string): Promise<void> {
  return invoke<void>('update_insight_notes', { id, notes });
}

// ─────────────────────────────────────────────────────────────────────────────
// Backup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a zip backup at destPath.
 * @param includePdfs - when true, bundle all PDF files into the archive.
 * @returns The path of the created backup file.
 */
export async function createBackup(destPath: string, includePdfs: boolean): Promise<string> {
  return invoke<string>('create_backup', { destPath, includePdfs });
}

/**
 * Restore the application database (and optionally PDFs) from a backup zip.
 * @returns The manifest embedded in the backup.
 */
export async function restoreBackup(sourcePath: string): Promise<BackupManifest> {
  return invoke<BackupManifest>('restore_backup', { sourcePath });
}

/** Read the manifest of a backup zip without performing a restore. */
export async function inspectBackup(sourcePath: string): Promise<BackupManifest> {
  return invoke<BackupManifest>('inspect_backup', { sourcePath });
}

/** Return the default directory used for backup files. */
export async function getBackupDir(): Promise<string> {
  return invoke<string>('get_backup_dir');
}

/** Return the application data directory. */
export async function getDataDir(): Promise<string> {
  return invoke<string>('get_data_dir');
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

/** Return the current application settings. */
export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('get_settings');
}

/** Persist the Claude API key in the local settings store. */
export async function saveApiKey(apiKey: string): Promise<void> {
  return invoke<void>('save_api_key', { apiKey });
}

/** Retrieve the stored Claude API key (undefined if not configured). */
export async function getApiKey(): Promise<string | null> {
  return invoke<string | null>('get_api_key');
}

/**
 * Persist an arbitrary key/value setting.
 * The "claude_api_key" key is rejected – use saveApiKey instead.
 */
export async function saveSetting(key: string, value: string): Promise<void> {
  return invoke<void>('save_setting', { key, value });
}

/**
 * Verify that the stored API key can reach the Anthropic API.
 * @returns true when the test request succeeds.
 */
export async function testApiConnection(): Promise<boolean> {
  return invoke<boolean>('test_api_connection');
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute all chart data for the given project.
 * Pass "all" or undefined to aggregate across every project.
 */
export async function getAnalytics(projectId?: string): Promise<AnalyticsData> {
  return invoke<AnalyticsData>('get_analytics', { projectId: projectId ?? null });
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search OpenAlex + Crossref for papers related to the given topic tag.
 * Results are stored in the suggested_papers table and returned.
 */
export async function findPapersForTopic(
  tagId: string,
  tagName: string,
  topicSummary?: string | null,
): Promise<SuggestedPaper[]> {
  return invoke<SuggestedPaper[]>('find_papers_for_topic', {
    tagId,
    tagName,
    topicSummary: topicSummary ?? null,
  });
}

/** Retrieve previously fetched suggestions for a topic tag. */
export async function getSuggestedPapers(tagId: string): Promise<SuggestedPaper[]> {
  return invoke<SuggestedPaper[]>('get_suggested_papers', { tagId });
}

/** Update the status of a suggested paper (e.g. "Dismissed", "Queued for Import"). */
export async function updateSuggestedPaperStatus(
  input: UpdateSuggestedPaperStatus,
): Promise<void> {
  return invoke<void>('update_suggested_paper_status', { input });
}
