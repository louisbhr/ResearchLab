import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Heart, ChevronDown, SlidersHorizontal, X, BookOpen, Clock, CheckCircle, Star, Library as LibraryIcon,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, ReadingStatusBadge, PaperTypeBadge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { formatAuthors, truncate, formatYear } from '../utils';
import type { Paper, PaperFilter, Tag } from '../types';
import { PAPER_TYPES, READING_STATUSES, SORT_OPTIONS } from '../types';
import AddPaperDialog from '../components/import/AddPaperDialog';
import PaperDetailView from '../components/paper/PaperDetailView';
import { debounce } from '../utils';

// ── Relevance dots ────────────────────────────────────────────────────────────
function RelevanceDots({ rating }: { rating?: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i <= r ? 'bg-cyan-500' : 'bg-gray-200',
          )}
        />
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4 py-3 rounded-lg bg-gray-50 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-2/5" />
          <div className="h-3 bg-gray-200 rounded w-1/6" />
          <div className="h-3 bg-gray-200 rounded w-10" />
          <div className="h-3 bg-gray-200 rounded w-1/6" />
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-8" />
          <div className="h-3 bg-gray-200 rounded w-5" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Library() {
  const {
    papers,
    tags,
    loading,
    filter,
    setFilter,
    resetFilter,
    setSelectedPaper,
    selectedPaperId,
    loadPapers,
    loadTags,
  } = useAppStore();

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filter.search_query ?? '');

  // Sync search query to store with debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((q: string) => setFilter({ search_query: q || null }), 350),
    [setFilter],
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    loadTags();
    loadPapers();
  }, [loadPapers, loadTags]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allPapersForStats = papers;
  const totalPapers = allPapersForStats.length;
  const unreadCount = allPapersForStats.filter((p) => p.reading_status === 'Unread').length;
  const inProgressCount = allPapersForStats.filter((p) => p.reading_status === 'In Progress').length;
  const readCount = allPapersForStats.filter((p) => p.reading_status === 'Read').length;
  const favoritesCount = allPapersForStats.filter((p) => p.favorite).length;
  const withRating = allPapersForStats.filter((p) => p.relevance_rating != null);
  const avgRelevance =
    withRating.length > 0
      ? (withRating.reduce((acc, p) => acc + (p.relevance_rating ?? 0), 0) / withRating.length).toFixed(1)
      : '—';

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const hasActiveFilters =
    filter.tag_ids?.length ||
    filter.reading_status?.length ||
    filter.paper_type?.length ||
    filter.year_from ||
    filter.year_to ||
    filter.relevance_min ||
    filter.favorite_only;

  const tagOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Tags' },
    ...tags.map((t: Tag) => ({ value: t.id, label: t.name })),
  ];

  const yearOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Years' },
    ...Array.from(
      new Set(papers.map((p) => p.year).filter((y): y is number => y != null)),
    )
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) })),
  ];

  const typeOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Types' },
    ...PAPER_TYPES.map((t) => ({ value: t, label: t })),
  ];

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Statuses' },
    ...READING_STATUSES.map((s) => ({ value: s, label: s })),
  ];

  const relevanceOptions: { value: string; label: string }[] = [
    { value: '', label: 'Any Relevance' },
    { value: '3', label: '3+' },
    { value: '4', label: '4+' },
    { value: '5', label: '5 only' },
  ];

  const sortOptions: { value: string; label: string }[] = SORT_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Library</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalPapers} paper{totalPapers !== 1 ? 's' : ''} in your collection
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
            Add Paper
          </Button>
        </div>

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3 mb-5">
          <StatCard
            title="Total Papers"
            value={totalPapers}
            icon={<LibraryIcon className="w-4 h-4" />}
          />
          <StatCard
            title="Unread"
            value={unreadCount}
            icon={<BookOpen className="w-4 h-4" />}
          />
          <StatCard
            title="In Progress"
            value={inProgressCount}
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard
            title="Read"
            value={readCount}
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <StatCard
            title="Favorites"
            value={favoritesCount}
            icon={<Heart className="w-4 h-4" />}
          />
          <StatCard
            title="Avg Relevance"
            value={avgRelevance}
            icon={<Star className="w-4 h-4" />}
          />
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search titles, authors, abstracts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setFilter({ search_query: null }); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tag filter */}
            <div className="relative">
              <select
                value={filter.tag_ids?.[0] ?? ''}
                onChange={(e) => setFilter({ tag_ids: e.target.value ? [e.target.value] : null })}
                className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
              >
                {tagOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Year filter */}
            <div className="relative">
              <select
                value={filter.year_from ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setFilter({ year_from: v, year_to: v });
                }}
                className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
              >
                {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Paper type */}
            <div className="relative">
              <select
                value={filter.paper_type?.[0] ?? ''}
                onChange={(e) => setFilter({ paper_type: e.target.value ? [e.target.value] : null })}
                className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
              >
                {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Reading status */}
            <div className="relative">
              <select
                value={filter.reading_status?.[0] ?? ''}
                onChange={(e) => setFilter({ reading_status: e.target.value ? [e.target.value] : null })}
                className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
              >
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Relevance */}
            <div className="relative">
              <select
                value={filter.relevance_min ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setFilter({ relevance_min: v, relevance_max: v === 5 ? 5 : null });
                }}
                className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
              >
                {relevanceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Favorite toggle */}
            <button
              onClick={() => setFilter({ favorite_only: filter.favorite_only ? null : true })}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filter.favorite_only
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50',
              )}
            >
              <Heart className={cn('w-3.5 h-3.5', filter.favorite_only && 'fill-rose-500')} />
              Favorites
            </button>

            {/* Sort */}
            <div className="relative ml-auto">
              <select
                value={filter.sort_by ?? 'date_added'}
                onChange={(e) => setFilter({ sort_by: e.target.value })}
                className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
              >
                {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilter}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        {loading ? (
          <TableSkeleton />
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <SlidersHorizontal className="w-10 h-10 mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">No papers found</p>
            <p className="text-sm mt-1">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first paper to get started.'}
            </p>
            {!hasActiveFilters && (
              <Button className="mt-4" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
                Add Paper
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_160px_48px_140px_160px_120px_120px_80px_32px] gap-x-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Title</span>
              <span>Authors</span>
              <span>Year</span>
              <span>Journal</span>
              <span>Tags</span>
              <span>Type</span>
              <span>Status</span>
              <span>Relevance</span>
              <span />
            </div>

            {/* Table rows */}
            {papers.map((paper: Paper) => (
              <PaperRow
                key={paper.id}
                paper={paper}
                selected={paper.id === selectedPaperId}
                onClick={() => setSelectedPaper(paper.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}
      <AddPaperDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {selectedPaperId && (
        <PaperDetailView
          open={!!selectedPaperId}
          onClose={() => setSelectedPaper(null)}
        />
      )}
    </div>
  );
}

// ── Paper row ──────────────────────────────────────────────────────────────────
function PaperRow({
  paper,
  selected,
  onClick,
}: {
  paper: Paper;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'grid grid-cols-[1fr_160px_48px_140px_160px_120px_120px_80px_32px] gap-x-3 px-4 py-3',
        'border-b border-gray-50 last:border-b-0 cursor-pointer transition-colors text-sm',
        selected ? 'bg-cyan-50' : 'hover:bg-gray-50',
      )}
    >
      {/* Title */}
      <span className="font-medium text-gray-800 truncate" title={paper.title}>
        {truncate(paper.title, 60)}
      </span>

      {/* Authors */}
      <span className="text-gray-500 text-xs truncate">
        {formatAuthors(paper.authors, 2)}
      </span>

      {/* Year */}
      <span className="text-gray-500 text-xs">{formatYear(paper.year)}</span>

      {/* Journal */}
      <span className="text-gray-400 text-xs truncate" title={paper.journal ?? ''}>
        {truncate(paper.journal ?? '', 22)}
      </span>

      {/* Tags */}
      <div className="flex gap-1 items-center min-w-0">
        {paper.tags.slice(0, 2).map((t) => (
          <Badge key={t.tag_id} variant="tag" className="truncate max-w-[72px]">
            {truncate(t.tag_name, 12)}
          </Badge>
        ))}
        {paper.tags.length > 2 && (
          <span className="text-xs text-gray-400">+{paper.tags.length - 2}</span>
        )}
      </div>

      {/* Type */}
      <div>
        <PaperTypeBadge type={paper.paper_type ?? undefined} />
      </div>

      {/* Reading status */}
      <div>
        <ReadingStatusBadge status={paper.reading_status} />
      </div>

      {/* Relevance dots */}
      <div className="flex items-center">
        <RelevanceDots rating={paper.relevance_rating} />
      </div>

      {/* Favorite */}
      <div className="flex items-center justify-center">
        {paper.favorite && <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />}
      </div>
    </div>
  );
}
