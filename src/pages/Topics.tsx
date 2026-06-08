import { useState, useEffect } from 'react';
import {
  Tag as TagIcon,
  FileText,
  Search,
  Plus,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  X,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import * as api from '../services/tauriApi';
import { generateTopicSummary } from '../services/aiService';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, ReadingStatusBadge } from '../components/ui/Badge';
import { RatingBar } from '../components/ui/RatingBar';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import { formatAuthors, formatYear, truncate } from '../utils';
import type { Tag, Paper, SuggestedPaper } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function avgTagRating(tagId: string, papers: Paper[]): number {
  const relevant = papers.filter((p) => p.tags.some((t) => t.tag_id === tagId));
  if (relevant.length === 0) return 0;
  const ratings = relevant.flatMap((p) =>
    p.tags.filter((t) => t.tag_id === tagId).map((t) => t.rating),
  );
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function papersForTag(tagId: string, papers: Paper[]): Paper[] {
  return papers
    .filter((p) => p.tags.some((t) => t.tag_id === tagId))
    .sort((a, b) => (b.relevance_rating ?? 0) - (a.relevance_rating ?? 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic Card
// ─────────────────────────────────────────────────────────────────────────────

interface TopicCardProps {
  tag: Tag;
  papers: Paper[];
  onClick: () => void;
}

function TopicCard({ tag, papers, onClick }: TopicCardProps) {
  const tagPapers = papersForTag(tag.id, papers);
  const avg = avgTagRating(tag.id, papers);
  const recent = tagPapers.slice(0, 3);

  return (
    <Card
      className="cursor-pointer hover:border-cyan-200 hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
            <TagIcon className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <h3 className="font-semibold text-gray-800 text-sm truncate">{tag.name}</h3>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 transition-colors flex-shrink-0" />
      </CardHeader>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{tagPapers.length} paper{tagPapers.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-400">avg {avg.toFixed(1)}/5</span>
      </div>

      {avg > 0 && (
        <div className="mb-3">
          <RatingBar rating={avg} max={5} size="sm" />
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-50 pt-3">
          {recent.map((p) => (
            <div key={p.id} className="flex items-start gap-1.5">
              <FileText className="w-3 h-3 text-gray-300 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate leading-tight">
                {truncate(p.title, 50)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tag.description && (
        <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">{tag.description}</p>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggested Paper Card
// ─────────────────────────────────────────────────────────────────────────────

interface SuggestedCardProps {
  suggestion: SuggestedPaper;
  onAddToLibrary: () => void;
  onIgnore: () => void;
  onReadLater: () => void;
  existsInLibrary: boolean;
}

function SuggestedPaperCard({
  suggestion,
  onAddToLibrary,
  onIgnore,
  onReadLater,
  existsInLibrary,
}: SuggestedCardProps) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-white hover:border-gray-200 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug mb-1">
            {suggestion.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {suggestion.authors.length > 0 && (
              <span>{formatAuthors(suggestion.authors, 2)}</span>
            )}
            {suggestion.year && <span>{suggestion.year}</span>}
            {suggestion.journal && (
              <span className="truncate max-w-[160px]">{suggestion.journal}</span>
            )}
          </div>
        </div>
        <Badge variant="source" className="flex-shrink-0 capitalize">
          {suggestion.source}
        </Badge>
      </div>

      {suggestion.abstract_text && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
          {suggestion.abstract_text}
        </p>
      )}

      {suggestion.relevance_reason && (
        <p className="text-xs text-cyan-700 bg-cyan-50 rounded-lg px-2.5 py-1.5 mb-3 leading-snug">
          {suggestion.relevance_reason}
        </p>
      )}

      {suggestion.doi && (
        <p className="text-xs text-gray-400 mb-3 font-mono">DOI: {suggestion.doi}</p>
      )}

      {existsInLibrary ? (
        <Badge variant="read">Already in Library</Badge>
      ) : suggestion.status === 'Dismissed' ? (
        <Badge variant="default">Dismissed</Badge>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={onAddToLibrary}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add to Library
          </Button>
          <Button size="sm" variant="secondary" onClick={onReadLater}>
            Read Later
          </Button>
          <Button size="sm" variant="ghost" onClick={onIgnore}>
            Ignore
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

interface TopicDetailProps {
  tag: Tag;
  papers: Paper[];
  onClose: () => void;
}

function TopicDetail({ tag, papers, onClose }: TopicDetailProps) {
  const { createPaper, loadTags } = useAppStore();
  const tagPapers = papersForTag(tag.id, papers);
  const avg = avgTagRating(tag.id, papers);

  const [suggestions, setSuggestions] = useState<SuggestedPaper[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Load cached suggestions on mount
  useEffect(() => {
    api.getSuggestedPapers(tag.id).then(setSuggestions).catch(() => {});
  }, [tag.id]);

  async function handleFindPapers() {
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const summary = await generateTopicSummary(tag.name, tagPapers);
      const results = await api.findPapersForTopic(tag.id, tag.name, summary);
      setSuggestions(results);
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleAddToLibrary(suggestion: SuggestedPaper) {
    setAddingId(suggestion.id);
    try {
      if (suggestion.doi) {
        const preview = await api.fetchDoiPreview(suggestion.doi);
        await createPaper({
          title: preview.title ?? suggestion.title,
          doi: preview.doi ?? suggestion.doi,
          authors: preview.authors.length > 0 ? preview.authors : suggestion.authors,
          year: preview.year ?? suggestion.year,
          journal: preview.journal ?? suggestion.journal,
          abstract_text: preview.abstract_text ?? suggestion.abstract_text,
          source_type: 'DOI',
          reading_status: 'Unread',
          tags: [{ tag_id: tag.id, tag_name: tag.name, rating: 3, ai_suggested: false, user_confirmed: true }],
        });
      } else {
        await createPaper({
          title: suggestion.title,
          doi: suggestion.doi,
          authors: suggestion.authors,
          year: suggestion.year,
          journal: suggestion.journal,
          abstract_text: suggestion.abstract_text,
          source_type: 'Manual',
          reading_status: 'Unread',
          tags: [{ tag_id: tag.id, tag_name: tag.name, rating: 3, ai_suggested: false, user_confirmed: true }],
        });
      }
      await api.updateSuggestedPaperStatus({ id: suggestion.id, status: 'Already in Library' });
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestion.id ? { ...s, status: 'Already in Library' } : s)),
      );
      loadTags();
    } catch (err) {
      console.error('Failed to add paper:', err);
    } finally {
      setAddingId(null);
    }
  }

  async function handleIgnore(suggestion: SuggestedPaper) {
    await api.updateSuggestedPaperStatus({ id: suggestion.id, status: 'Dismissed' });
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, status: 'Dismissed' } : s)),
    );
  }

  async function handleReadLater(suggestion: SuggestedPaper) {
    await api.updateSuggestedPaperStatus({ id: suggestion.id, status: 'Queued for Import' });
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, status: 'Queued for Import' } : s)),
    );
  }

  const activeSuggestions = suggestions.filter((s) => s.status !== 'Dismissed');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
              <TagIcon className="w-4 h-4 text-cyan-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">{tag.name}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 ml-10">
            <span>{tagPapers.length} papers</span>
            {avg > 0 && <span>avg rating {avg.toFixed(1)}/5</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Avg rating bar */}
      {avg > 0 && (
        <div className="mb-5">
          <RatingBar rating={avg} max={5} size="md" showLabel />
        </div>
      )}

      {/* Papers list */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Papers in this Topic
        </h3>
        <div className="space-y-2 max-h-52 overflow-auto">
          {tagPapers.length === 0 ? (
            <p className="text-sm text-gray-400">No papers tagged with this topic.</p>
          ) : (
            tagPapers.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700 truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatAuthors(p.authors, 2)}</span>
                    {p.year && <span className="text-xs text-gray-400">{p.year}</span>}
                  </div>
                </div>
                <ReadingStatusBadge status={p.reading_status} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Find new papers */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Recommended Papers
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFindPapers}
            loading={loadingSuggestions}
            icon={<Search className="w-3.5 h-3.5" />}
          >
            Find New Papers
          </Button>
        </div>

        {suggestionError && (
          <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
            {suggestionError}
          </div>
        )}

        {loadingSuggestions && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        )}

        {!loadingSuggestions && activeSuggestions.length > 0 && (
          <div className="space-y-3 max-h-80 overflow-auto">
            {activeSuggestions.map((s) => (
              <SuggestedPaperCard
                key={s.id}
                suggestion={s}
                existsInLibrary={s.status === 'Already in Library'}
                onAddToLibrary={() => handleAddToLibrary(s)}
                onIgnore={() => handleIgnore(s)}
                onReadLater={() => handleReadLater(s)}
              />
            ))}
          </div>
        )}

        {!loadingSuggestions && activeSuggestions.length === 0 && suggestions.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            Click "Find New Papers" to discover related research.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Topics Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topics() {
  const { tags, papers, loading, loadTags, loadPapers } = useAppStore();
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTags();
    loadPapers();
  }, [loadTags, loadPapers]);

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sort tags by paper count desc
  const sortedTags = [...filteredTags].sort((a, b) => {
    const aCount = papersForTag(a.id, papers).length;
    const bCount = papersForTag(b.id, papers).length;
    return bCount - aCount;
  });

  if (loading && tags.length === 0) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: topics grid */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-auto">
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Topics</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {tags.length} topic{tags.length !== 1 ? 's' : ''} across your library
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 px-6 pb-6">
          {tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Layers className="w-12 h-12 mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">No topics yet</p>
              <p className="text-sm mt-1 text-center max-w-xs">
                Topics are created automatically when you tag papers. Add papers with tags to see
                them here.
              </p>
            </div>
          ) : sortedTags.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No topics match "{searchQuery}".
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedTags.map((tag) => (
                <TopicCard
                  key={tag.id}
                  tag={tag}
                  papers={papers}
                  onClick={() => setSelectedTag(tag)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selectedTag && (
        <div className="w-[420px] flex-shrink-0 border-l border-gray-100 bg-white overflow-auto">
          <div className="p-5">
            <TopicDetail
              tag={selectedTag}
              papers={papers}
              onClose={() => setSelectedTag(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
