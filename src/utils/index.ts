import type { Paper } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Author formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format an authors array into a short citation-style string.
 *
 * Examples:
 *  - []              → ''
 *  - ['Smith']       → 'Smith'
 *  - ['Smith','Jones'] → 'Smith, Jones'
 *  - ['A','B','C','D'] (maxShow=3) → 'A, B, C et al.'
 */
export function formatAuthors(authors: string[], maxShow = 3): string {
  if (!authors || authors.length === 0) return '';
  if (authors.length <= maxShow) return authors.join(', ');
  return `${authors.slice(0, maxShow).join(', ')} et al.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Year formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the year as a string, or 'N/A' when absent.
 */
export function formatYear(year?: number | null): string {
  if (year == null) return 'N/A';
  return String(year);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading status colours  (Tailwind classes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns Tailwind CSS classes for a badge representing the given reading status.
 *
 * Covers: 'Unread' | 'In Progress' | 'Read'
 */
export function getReadingStatusColor(status: string): string {
  switch (status) {
    case 'Read':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'Unread':
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Paper type colours  (Tailwind classes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns Tailwind CSS classes for a badge representing the given paper type.
 */
export function getPaperTypeColor(type: string): string {
  switch (type) {
    case 'Empirical Study':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'Review / Survey':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    case 'Meta-Analysis':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
    case 'Theoretical':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'Methodology':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300';
    case 'Case Study':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300';
    case 'Technical Report':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'Conference Paper':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
    case 'Book Chapter':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'Preprint':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
    case 'Other':
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Date formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string into a human-readable form such as "Jun 8, 2026".
 * Returns the original string on parse failure rather than throwing.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Text truncation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncates text to at most `maxLen` characters, appending "…" when truncated.
 * If the text is already within bounds it is returned unchanged.
 */
export function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + '…';
}

// ─────────────────────────────────────────────────────────────────────────────
// Relevance / rating colours  (Tailwind classes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a Tailwind text-colour class for a 1–5 rating.
 *
 * 1 → grey (not relevant)
 * 2 → red
 * 3 → amber / yellow
 * 4 → lime / light-green
 * 5 → green (highly relevant)
 */
export function getRatingColor(rating: number): string {
  switch (Math.round(rating)) {
    case 1:
      return 'text-gray-400 dark:text-gray-500';
    case 2:
      return 'text-red-400 dark:text-red-400';
    case 3:
      return 'text-amber-400 dark:text-amber-400';
    case 4:
      return 'text-lime-500 dark:text-lime-400';
    case 5:
      return 'text-green-500 dark:text-green-400';
    default:
      return 'text-gray-400 dark:text-gray-500';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialises a list of papers to a CSV file and triggers a browser download.
 *
 * Columns: ID, Title, Authors, Year, Journal, DOI, Type, Status, Relevance,
 *          Favorite, Tags, Projects, Date Added, Summary
 */
export function exportToCsv(papers: Paper[]): void {
  const escape = (value: unknown): string => {
    const str = value == null ? '' : String(value);
    // Wrap in quotes if the value contains a comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'ID',
    'Title',
    'Authors',
    'Year',
    'Journal',
    'DOI',
    'Paper Type',
    'Reading Status',
    'Relevance Rating',
    'Favorite',
    'Tags',
    'Date Added',
    'Short Summary',
  ];

  const rows: string[][] = papers.map((p) => [
    p.id,
    p.title,
    (p.authors ?? []).join('; '),
    p.year != null ? String(p.year) : '',
    p.journal ?? '',
    p.doi ?? '',
    p.paper_type ?? '',
    p.reading_status,
    p.relevance_rating != null ? String(p.relevance_rating) : '',
    p.favorite ? 'Yes' : 'No',
    (p.tags ?? []).map((t) => t.tag_name).join('; '),
    p.date_added,
    p.short_summary ?? '',
  ]);

  const csvContent =
    [headers, ...rows]
      .map((row) => row.map(escape).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `researchlab-export-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Debounce
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` that delays invocation until `delay` ms
 * have elapsed since the last call. The returned function also exposes a
 * `.cancel()` method that clears any pending invocation.
 *
 * @example
 *   const debouncedSearch = debounce((q: string) => search(q), 300);
 *   input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced as T & { cancel: () => void };
}

// ─────────────────────────────────────────────────────────────────────────────
// Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clamp a number between a minimum and maximum value (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Returns true when two string arrays contain the same elements (order-independent).
 */
export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
}

/**
 * Generate a short human-readable label for a paper: "AuthorLastName (Year)".
 * Falls back gracefully when data is missing.
 */
export function paperCitationKey(paper: Paper): string {
  const firstAuthor = paper.authors?.[0];
  const lastName = firstAuthor ? firstAuthor.split(/[\s,]+/).pop() ?? firstAuthor : 'Unknown';
  const year = paper.year != null ? `(${paper.year})` : '';
  return year ? `${lastName} ${year}` : lastName;
}
