import { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Bookmark,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import * as api from '../services/tauriApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Paper } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { formatDate, truncate } from '../utils';
import type { Insight } from '../types';
import { ANALYSIS_TYPES } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Formatted result renderer
// ─────────────────────────────────────────────────────────────────────────────

function FormattedResult({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, idx) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-bold text-gray-800 mt-4 mb-1 first:mt-0">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg font-bold text-gray-800 mt-4 mb-2 first:mt-0">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold text-gray-700 mt-3 mb-1 first:mt-0">
              {line.slice(4)}
            </h3>
          );
        }
        if (/^[-*]\s/.test(line)) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-2">
                <span className="font-semibold text-cyan-600 flex-shrink-0 w-5 text-right">
                  {match[1]}.
                </span>
                <span>{match[2]}</span>
              </div>
            );
          }
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-1.5" />;
        }
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight Card
// ─────────────────────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: Insight;
  papers: Paper[];
  onOpen: () => void;
  onDelete: () => void;
}

function InsightCard({ insight, papers, onOpen, onDelete }: InsightCardProps) {
  const usedPapers = insight.used_paper_ids
    .slice(0, 2)
    .map((id) => papers.find((p: Paper) => p.id === id))
    .filter((p): p is Paper => p !== undefined);

  return (
    <Card className="flex flex-col h-full hover:border-gray-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-gray-800 truncate leading-snug">
            {insight.title}
          </h3>
        </div>
        <Badge variant="tag" className="flex-shrink-0 capitalize">
          {insight.analysis_type}
        </Badge>
      </div>

      {/* Date + paper count */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(insight.created_at)}
        </div>
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {insight.used_paper_ids.length} paper{insight.used_paper_ids.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Papers used */}
      {usedPapers.length > 0 && (
        <div className="mb-3 space-y-1">
          {usedPapers.map((p) => p && (
            <p key={p.id} className="text-xs text-gray-500 truncate leading-snug">
              — {truncate(p.title, 55)}
            </p>
          ))}
          {insight.used_paper_ids.length > 2 && (
            <p className="text-xs text-gray-400">
              +{insight.used_paper_ids.length - 2} more
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      <p className="text-xs text-gray-500 flex-1 leading-relaxed mb-4 line-clamp-3">
        {truncate(insight.result.replace(/^#+\s+/gm, '').replace(/\n+/g, ' '), 200)}
      </p>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Button size="sm" onClick={onOpen} icon={<ExternalLink className="w-3.5 h-3.5" />}>
          Open
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 hover:bg-red-50"
          icon={<Trash2 className="w-3.5 h-3.5" />}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SavedInsights Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SavedInsights() {
  const { insights, papers, loading, loadInsights, deleteInsight } = useAppStore();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortDesc, setSortDesc] = useState(true);

  // Open modal
  const [openInsight, setOpenInsight] = useState<Insight | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Insight | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Update notes textarea when insight changes
  useEffect(() => {
    if (openInsight) {
      setNotes(openInsight.notes ?? '');
      setNotesSaved(false);
    }
  }, [openInsight?.id]);

  // ── Filtering & sorting ──────────────────────────────────────────────────

  const filtered = insights
    .filter((i) => typeFilter === 'all' || i.analysis_type === typeFilter)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDesc ? dateB - dateA : dateA - dateB;
    });

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveNotes() {
    if (!openInsight) return;
    setSavingNotes(true);
    try {
      await api.updateInsightNotes(openInsight.id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInsight(deleteTarget.id);
      if (openInsight?.id === deleteTarget.id) setOpenInsight(null);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const usedPapersForOpen = openInsight
    ? openInsight.used_paper_ids
        .map((id) => papers.find((p) => p.id === id))
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Saved Insights</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {insights.length} saved insight{insights.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
            >
              <option value="all">All Types</option>
              {ANALYSIS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sortDesc ? 'desc' : 'asc'}
              onChange={(e) => setSortDesc(e.target.value === 'desc')}
              className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white appearance-none"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6">
        {loading && insights.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Bookmark className="w-10 h-10 mb-3 text-gray-200" />
            {insights.length === 0 ? (
              <>
                <p className="font-medium text-gray-500">No saved insights yet</p>
                <p className="text-sm mt-1 text-center max-w-xs">
                  Go to AI Insights to generate and save your first analysis.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-500">No insights match your filter</p>
                <button
                  className="text-sm text-cyan-600 mt-1 hover:underline"
                  onClick={() => setTypeFilter('all')}
                >
                  Clear filter
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                papers={papers}
                onOpen={() => setOpenInsight(insight)}
                onDelete={() => setDeleteTarget(insight)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Open Insight Modal */}
      <Modal
        open={!!openInsight}
        onClose={() => setOpenInsight(null)}
        title={openInsight?.title}
        size="2xl"
        footer={
          <Button variant="secondary" onClick={() => setOpenInsight(null)}>
            Close
          </Button>
        }
      >
        {openInsight && (
          <div className="space-y-5">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pb-3 border-b border-gray-100">
              <Badge variant="tag">{openInsight.analysis_type}</Badge>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(openInsight.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {openInsight.used_paper_ids.length} paper{openInsight.used_paper_ids.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Papers used */}
            {usedPapersForOpen.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Papers Used
                </p>
                <div className="space-y-1.5">
                  {usedPapersForOpen.map((p) => p && (
                    <div key={p.id} className="flex items-start gap-2">
                      <FileText className="w-3 h-3 text-gray-300 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-600">{p.title}</span>
                    </div>
                  ))}
                  {openInsight.used_paper_ids.length > usedPapersForOpen.length && (
                    <p className="text-xs text-gray-400 ml-5">
                      +{openInsight.used_paper_ids.length - usedPapersForOpen.length} more not in current view
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Result */}
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <FormattedResult text={openInsight.result} />
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Notes
              </p>
              <Textarea
                placeholder="Add personal notes about this insight..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={handleSaveNotes} loading={savingNotes}>
                  Save Notes
                </Button>
                {notesSaved && (
                  <span className="text-xs text-emerald-600">Notes saved.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Insight"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold">"{deleteTarget?.title}"</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
