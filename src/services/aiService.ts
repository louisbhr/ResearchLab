import type { Paper, Tag, AIAnalysisResult, AIAnalysisTag } from '../types';
import { PAPER_TYPES } from '../types';
import { getApiKey } from './tauriApi';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requireApiKey(): Promise<string> {
  const key = await getApiKey();
  if (!key || key.trim() === '') {
    throw new Error(
      'Claude API key is not configured. Please add your API key in Settings.',
    );
  }
  return key.trim();
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequestBody {
  model: string;
  max_tokens: number;
  system?: string;
  messages: ClaudeMessage[];
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048,
): Promise<string> {
  const apiKey = await requireApiKey();

  const body: ClaudeRequestBody = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error?.message) {
        errorDetail = errBody.error.message;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(`Claude API request failed: ${errorDetail}`);
  }

  const data = await response.json();

  // Extract the text content from the response
  const content = data?.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Claude API returned an empty response.');
  }
  const textBlock = content.find((c: { type: string }) => c.type === 'text');
  if (!textBlock || typeof textBlock.text !== 'string') {
    throw new Error('Claude API response did not contain a text block.');
  }
  return textBlock.text;
}

/**
 * Attempt to parse a JSON block out of the model response.
 * The model may wrap JSON in a markdown fence; this strips it first.
 */
function parseJsonFromResponse<T>(raw: string): T {
  // Strip optional ```json ... ``` fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim();
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON from AI response: ${(err as Error).message}\n\nRaw response:\n${raw}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a newly imported paper and return structured metadata suggestions.
 *
 * @param paper  - Minimal paper data (title, abstract, authors, year, journal).
 * @param existingTags - Full list of tags already in the library so the model
 *                       can flag when a suggested tag already exists.
 */
export async function analyzeImportedPaper(
  paper: {
    title: string;
    abstract_text?: string | null;
    authors?: string[];
    year?: number | null;
    journal?: string | null;
  },
  existingTags: Tag[],
): Promise<AIAnalysisResult> {
  const validPaperTypes = PAPER_TYPES.join(', ');
  const existingTagNames = existingTags.map((t) => t.name).join(', ') || 'none';

  const systemPrompt = `You are a research paper analysis assistant. Your job is to analyse academic papers and return structured metadata suggestions in JSON format.

You MUST respond with ONLY valid JSON — no prose, no markdown outside the fence, no explanations.

Return exactly this JSON structure:
{
  "shortSummary": "<1-3 sentence plain-language summary of what the paper is about and its main contribution>",
  "keyFindings": [
    "<finding 1>",
    "<finding 2>",
    "<finding 3>"
  ],
  "paperType": "<one of: ${validPaperTypes}>",
  "tags": [
    {
      "name": "<topic or concept tag>",
      "rating": <integer 1-5, how central this topic is to the paper>,
      "reason": "<1 sentence explaining why this tag applies>",
      "isExistingTag": <true if the tag name closely matches an existing tag, false otherwise>
    }
  ],
  "relevanceSuggestion": <integer 1-5, estimated general research relevance>
}

Rules:
- keyFindings must contain 3-5 items.
- paperType must be exactly one of the valid types listed above.
- tags should capture the 3-7 most important topics, methods, or concepts.
- For each tag, set isExistingTag to true only if the tag name closely matches one of the existing library tags.
- relevanceSuggestion: 1 = low relevance, 5 = extremely important/foundational.
- Existing library tags: ${existingTagNames}`;

  const userMessage = `Please analyse this paper:

Title: ${paper.title}
Authors: ${(paper.authors ?? []).join('; ') || 'Unknown'}
Year: ${paper.year ?? 'Unknown'}
Journal/Venue: ${paper.journal ?? 'Unknown'}
Abstract: ${paper.abstract_text ?? 'No abstract available.'}`;

  const raw = await callClaude(systemPrompt, userMessage, 2048);
  const parsed = parseJsonFromResponse<{
    shortSummary: string;
    keyFindings: string[];
    paperType: string;
    tags: Array<{ name: string; rating: number; reason: string; isExistingTag: boolean }>;
    relevanceSuggestion: number;
  }>(raw);

  // Validate and sanitise
  const validType = (PAPER_TYPES as readonly string[]).includes(parsed.paperType)
    ? parsed.paperType
    : 'Other';

  const tags: AIAnalysisTag[] = (parsed.tags ?? []).map((t) => ({
    name: String(t.name ?? '').trim(),
    rating: Math.min(5, Math.max(1, Math.round(Number(t.rating) || 3))),
    reason: String(t.reason ?? ''),
    isExistingTag: Boolean(t.isExistingTag),
  })).filter((t) => t.name.length > 0);

  return {
    shortSummary: String(parsed.shortSummary ?? ''),
    keyFindings: (parsed.keyFindings ?? []).map(String).filter(Boolean),
    paperType: validType,
    tags,
    relevanceSuggestion: Math.min(5, Math.max(1, Math.round(Number(parsed.relevanceSuggestion) || 3))),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a detailed textual insight for a set of papers.
 *
 * @param analysisType - One of the ANALYSIS_TYPES constants.
 * @param papers       - Papers to include in the analysis.
 * @param filters      - The filter state at the time of analysis (stored for provenance).
 */
export async function generateInsight(
  analysisType: string,
  papers: Paper[],
  filters: object,
): Promise<string> {
  if (papers.length === 0) {
    throw new Error('No papers provided for insight generation.');
  }

  // Build a condensed paper list for the prompt to stay within token budget
  const paperList = papers
    .slice(0, 40)
    .map((p, i) => {
      const authors = p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '');
      const tags = p.tags.map((t) => `${t.tag_name}(${t.rating})`).join(', ');
      return [
        `[${i + 1}] "${p.title}"`,
        `    Authors: ${authors || 'Unknown'} | Year: ${p.year ?? 'N/A'} | Type: ${p.paper_type ?? 'N/A'}`,
        `    Tags: ${tags || 'none'} | Relevance: ${p.relevance_rating ?? 'N/A'}/5`,
        p.short_summary ? `    Summary: ${p.short_summary}` : '',
        p.key_findings?.length
          ? `    Key findings: ${p.key_findings.slice(0, 2).join(' / ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const truncatedNote =
    papers.length > 40
      ? `\n\n(Note: ${papers.length - 40} additional papers were not shown due to length limits.)`
      : '';

  const appliedFilters = JSON.stringify(filters, null, 2);

  // Build a prompt tailored to each analysis type
  let taskDescription: string;
  switch (analysisType) {
    case 'Topic Clustering':
      taskDescription = `Identify and describe the main thematic clusters present in this collection of papers. For each cluster: name it, list the papers that belong to it (by number), and briefly describe what unifies them. Then provide a 1-2 paragraph synthesis of the overall thematic landscape.`;
      break;

    case 'Paper Comparison':
      taskDescription = `Compare and contrast the papers in this set. Identify: (1) shared methodological approaches, (2) contrasting conclusions or findings, (3) papers that build on or respond to each other, (4) gaps left unexplored by the collection collectively. Structure your response with clear headings.`;
      break;

    case 'Research Overview':
      taskDescription = `Write a structured research overview of this paper collection as if writing the introduction to a literature review. Cover: the central research problem(s), the evolution of approaches over time, key theoretical frameworks, landmark papers, and the current state of the field. Aim for 4-6 paragraphs.`;
      break;

    case 'Research Gaps':
      taskDescription = `Identify the most significant research gaps revealed by this paper collection. For each gap: (1) describe it clearly, (2) explain which papers hint at it or leave it unaddressed, (3) suggest what type of study could fill it. List at least 3-5 gaps, ordered by estimated importance.`;
      break;

    case 'Contradiction Detection':
      taskDescription = `Identify apparent contradictions, conflicting findings, or methodological disagreements among these papers. For each contradiction: (1) state the conflicting claims, (2) identify which papers hold each position, (3) suggest possible explanations (different contexts, methods, populations, etc.). Be precise and cite paper numbers.`;
      break;

    case 'Similar Papers':
      taskDescription = `Group these papers by similarity — papers that address the same specific question, use the same dataset or method, or reach closely related conclusions. For each similarity group, explain what makes them similar and how they differ in approach or contribution.`;
      break;

    default:
      taskDescription = `Provide a detailed analytical summary of this collection of research papers, highlighting key themes, methodologies, findings, and relationships between papers.`;
  }

  const systemPrompt = `You are an expert research analyst specialising in systematic literature analysis. You produce clear, insightful, well-structured analyses of academic paper collections.

Write in an academic but accessible style. Use concrete references to specific papers (use their numbers from the list). Be specific rather than vague. Avoid filler phrases.`;

  const userMessage = `Perform a "${analysisType}" analysis on the following ${papers.length} papers.

Task: ${taskDescription}

Applied filters when selecting these papers:
${appliedFilters}

Papers:
${paperList}${truncatedNote}`;

  return callClaude(systemPrompt, userMessage, 4096);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a concise topic summary for use in paper recommendation queries.
 *
 * @param tagName - The topic tag name.
 * @param papers  - Papers already tagged with this topic.
 */
export async function generateTopicSummary(
  tagName: string,
  papers: Paper[],
): Promise<string> {
  if (papers.length === 0) {
    return tagName;
  }

  const paperSummaries = papers
    .slice(0, 20)
    .map((p) => {
      const parts = [`"${p.title}"`];
      if (p.year) parts.push(`(${p.year})`);
      if (p.short_summary) parts.push(`— ${p.short_summary}`);
      return parts.join(' ');
    })
    .join('\n');

  const systemPrompt = `You are a research assistant. Given a research topic and a list of papers tagged with it, write a concise 2-3 sentence description of the research area. This description will be used as a search query to find additional related papers, so it should be specific, informative, and rich in relevant keywords. Output only the description text — no preamble, no labels.`;

  const userMessage = `Topic tag: "${tagName}"

Papers tagged with this topic (${papers.length} total, showing up to 20):
${paperSummaries}`;

  return callClaude(systemPrompt, userMessage, 512);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface SimilarPaperResult {
  paper: Paper;
  reason: string;
  score: number;
}

/**
 * Find papers in `allPapers` that are semantically similar to `targetPaper`.
 *
 * Returns up to 10 results sorted by score descending.
 */
export async function findSimilarPapers(
  targetPaper: Paper,
  allPapers: Paper[],
): Promise<SimilarPaperResult[]> {
  // Exclude the paper itself
  const candidates = allPapers.filter((p) => p.id !== targetPaper.id);

  if (candidates.length === 0) {
    return [];
  }

  const targetTags = targetPaper.tags.map((t) => t.tag_name).join(', ');
  const targetInfo = [
    `Title: ${targetPaper.title}`,
    `Authors: ${targetPaper.authors.slice(0, 4).join(', ')}`,
    `Year: ${targetPaper.year ?? 'N/A'}`,
    `Type: ${targetPaper.paper_type ?? 'N/A'}`,
    `Tags: ${targetTags || 'none'}`,
    targetPaper.abstract_text ? `Abstract: ${targetPaper.abstract_text.slice(0, 500)}` : '',
    targetPaper.short_summary ? `Summary: ${targetPaper.short_summary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Build a numbered list of candidates (capped to avoid huge prompts)
  const cap = Math.min(candidates.length, 50);
  const candidateList = candidates.slice(0, cap).map((p, i) => {
    const tags = p.tags.map((t) => t.tag_name).join(', ');
    return `[${i + 1}] id=${p.id} | "${p.title}" (${p.year ?? 'N/A'}) | Tags: ${tags || 'none'} | ${p.short_summary?.slice(0, 120) ?? ''}`;
  }).join('\n');

  const systemPrompt = `You are a research similarity expert. Given a target paper and a list of candidate papers, identify which candidates are most similar to the target. Consider: shared topics, methods, research questions, datasets, and theoretical frameworks.

Respond with ONLY valid JSON in this format:
{
  "similar": [
    { "index": <1-based index in the candidate list>, "score": <float 0.0-1.0>, "reason": "<1-2 sentence explanation>" },
    ...
  ]
}

Return the top 10 most similar papers. Only include papers with score >= 0.3.`;

  const userMessage = `Target paper:
${targetInfo}

Candidate papers (${candidates.length} total, evaluating first ${cap}):
${candidateList}`;

  const raw = await callClaude(systemPrompt, userMessage, 2048);

  let parsed: { similar: Array<{ index: number; score: number; reason: string }> };
  try {
    parsed = parseJsonFromResponse(raw);
  } catch {
    // If parsing fails, return empty rather than crashing
    return [];
  }

  const results: SimilarPaperResult[] = [];
  for (const item of parsed.similar ?? []) {
    const idx = Math.round(item.index) - 1;
    if (idx < 0 || idx >= cap) continue;
    const paper = candidates[idx];
    if (!paper) continue;
    results.push({
      paper,
      reason: String(item.reason ?? ''),
      score: Math.min(1, Math.max(0, Number(item.score) || 0)),
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10);
}
