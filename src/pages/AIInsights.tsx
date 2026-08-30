import { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  GitCompare,
  BookOpen,
  AlertTriangle,
  Zap,
  Copy,
  Sparkles,
  Save,
  X,
  Key,
  SlidersHorizontal,
  ListChecks,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { generateInsight } from '../services/aiService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { truncate } from '../utils';
import type { Paper, PaperFilter, CreateInsightInput } from '../types';
import { ANALYSIS_TYPES, READING_STATUSES } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Analysis type definitions
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSIS_TYPE_META: Record<
  string,
  { icon: React.ReactNode; description: string; color: string }
> = {
  'Topic Clustering': {
    icon: <Layers className="w-5 h-5" />,
    description: 'Group papers into thematic clusters and identify the research landscape.',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  'Paper Comparison': {
    icon: <GitCompare className="w-5 h-5" />,
    description: 'Compare methodologies, findings, and gaps across your selected papers.',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  'Research Overview': {
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Generate a structured literature review introduction for the paper set.',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'Research Gaps': {
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Identify unexplored areas and suggest future directions from the collection.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'Contradiction Detection': {
    icon: <Zap className="w-5 h-5" />,
    description: 'Spot conflicting findings and methodological disagreements between papers.',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  'Similar Papers': {
    icon: <Copy className="w-5 h-5" />,
    description: 'Group papers by similarity and highlight overlapping contributions.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

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
// Main AI Insights Page
// ─────────────────────────────────────────────────────────────────────────────

type SelectionMode = 'filter' | 'manual';

export default function AIInsights() {
  const { papers, tags, projects, settings, createInsight, loadPapers, loadTags } =
    useAppStore();

  // ── Selection mode ───────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('filter');

  // Filter mode state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');

  // Manual mode state
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [manualSearch, setManualSearch] = useState('');
  const [showSelected, setShowSelected] = useState(false);

  // Analysis
  const [analysisType, setAnalysisType] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { loadPapers(); loadTags(); }, [loadPapers, loadTags]);

  // ── Compute selected papers ──────────────────────────────────────────────

  const filteredPapers = useMemo(() => papers.filter((p: Paper) => {
    if (selectedProjectId !== 'all' && !p.project_ids.includes(selectedProjectId)) return false;
    if (selectedTagIds.length > 0 && !selectedTagIds.some((id) => p.tags.some((t) => t.tag_id === id))) return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.reading_status)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(p.paper_type ?? '')) return false;
    if (yearFrom && p.year != null && p.year < Number(yearFrom)) return false;
    if (yearTo && p.year != null && p.year > Number(yearTo)) return false;
    return true;
  }), [papers, selectedProjectId, selectedTagIds, selectedStatuses, selectedTypes, yearFrom, yearTo]);

  // Manual mode: only show papers matching search
  const manualFiltered = useMemo(() => {
    const q = manualSearch.toLowerCase();
    return q ? papers.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q)) ||
      (p.year && String(p.year).includes(q))
    ) : papers;
  }, [papers, manualSearch]);

  // Final selected set: manual mode overrides filter mode
  const selectedPapers: Paper[] = selectionMode === 'manual'
    ? papers.filter((p) => manualIds.includes(p.id))
    : filteredPapers;

  const activeFilters: PaperFilter = {
    project_id: selectedProjectId !== 'all' ? selectedProjectId : null,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
    reading_status: selectedStatuses.length > 0 ? selectedStatuses : null,
    paper_type: selectedTypes.length > 0 ? selectedTypes : null,
    year_from: yearFrom ? Number(yearFrom) : null,
    year_to: yearTo ? Number(yearTo) : null,
  };

  const paperTypes = settings?.paper_types ?? [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  function toggleManual(id: string) {
    setManualIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function toggleType(t: string) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function clearFilters() {
    setYearFrom(''); setYearTo('');
    setSelectedTagIds([]); setSelectedStatuses([]);
    setSelectedTypes([]); setSelectedProjectId('all');
  }

  async function handleGenerate() {
    if (!analysisType || selectedPapers.length === 0) return;
    setGenerating(true);
    setGenError(null);
    setResult(null);
    try {
      const text = await generateInsight(analysisType, selectedPapers, activeFilters);
      setResult(text);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!result || !analysisType || !saveTitle.trim()) return;
    setSaving(true);
    try {
      const input: CreateInsightInput = {
        title: saveTitle.trim(),
        analysis_type: analysisType,
        result,
        used_filters: JSON.stringify(activeFilters),
        used_paper_ids: selectedPapers.map((p) => p.id),
      };
      await createInsight(input);
      setSaveSuccess(true);
      setSaveOpen(false);
      setSaveTitle('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  const apiKeyMissing = settings && !settings.claude_api_key_set;
  const canGenerate = analysisType !== null && selectedPapers.length > 0 && !apiKeyMissing;

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-5 h-5 text-cyan-500" />
          <h1 className="text-xl font-bold text-gray-800">AI Insights</h1>
        </div>
        <p className="text-xs text-gray-500 ml-8">
          Select papers, choose an analysis type, and let Claude generate insights.
        </p>
      </div>

      {/* API key warning */}
      {apiKeyMissing && (
        <div className="mx-6 mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
          <Key className="w-4 h-4 flex-shrink-0" />
          No API key configured. Go to Settings to add your Claude API key.
        </div>
      )}

      <div className="flex-1 px-6 pb-6 space-y-5">

        {/* ── Step 1: Select Papers ──────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">1</div>
              <h2 className="text-sm font-semibold text-gray-800">Select Papers</h2>
            </div>
            <span className={cn(
              'text-xs font-medium px-2.5 py-0.5 rounded-full',
              selectedPapers.length > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500',
            )}>
              {selectedPapers.length} paper{selectedPapers.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
            <button
              onClick={() => setSelectionMode('filter')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectionMode === 'filter' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter by criteria
            </button>
            <button
              onClick={() => setSelectionMode('manual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectionMode === 'manual' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <ListChecks className="w-3.5 h-3.5" />
              Pick manually
              {manualIds.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-semibold">
                  {manualIds.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Filter mode ───────────────────────────────────────────────── */}
          {selectionMode === 'filter' && (
            <div className="space-y-3">
              {/* Project */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Reading Status */}
              <div className="flex items-start gap-3">
                <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0 pt-1">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {READING_STATUSES.map((s) => (
                    <button key={s} onClick={() => toggleStatus(s)}
                      className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                        selectedStatuses.includes(s) ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-300'
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Type */}
              {paperTypes.length > 0 && (
                <div className="flex items-start gap-3">
                  <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0 pt-1">Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {paperTypes.map((t) => (
                      <button key={t} onClick={() => toggleType(t)}
                        className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                          selectedTypes.includes(t) ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                        )}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-start gap-3">
                  <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0 pt-1">Tags</label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                    {tags.map((tag) => (
                      <button key={tag.id} onClick={() => toggleTag(tag.id)}
                        className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                          selectedTagIds.includes(tag.id) ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-300'
                        )}>
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Year Range */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">Year</label>
                <input type="number" placeholder="From" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}
                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none" />
                <span className="text-gray-400 text-xs">—</span>
                <input type="number" placeholder="To" value={yearTo} onChange={(e) => setYearTo(e.target.value)}
                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none" />
                {(yearFrom || yearTo || selectedTagIds.length > 0 || selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedProjectId !== 'all') && (
                  <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>

              {/* Filter result preview */}
              {filteredPapers.length > 0 && (
                <div className="pt-2 border-t border-gray-50">
                  <button
                    onClick={() => setShowSelected((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-600"
                  >
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showSelected && '-rotate-180')} />
                    {showSelected ? 'Hide' : 'Preview'} {filteredPapers.length} selected paper{filteredPapers.length !== 1 ? 's' : ''}
                  </button>
                  {showSelected && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                      {filteredPapers.map((p) => (
                        <div key={p.id} className="flex items-baseline gap-2 text-xs text-gray-600">
                          <span className="truncate">{p.title}</span>
                          {p.year && <span className="text-gray-400 flex-shrink-0">{p.year}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {filteredPapers.length === 0 && (
                <p className="text-xs text-gray-400 pt-1">No papers match the current filters.</p>
              )}
            </div>
          )}

          {/* ── Manual mode ───────────────────────────────────────────────── */}
          {selectionMode === 'manual' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Only the papers you check here will be analysed — filters are ignored in this mode.
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search papers…"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none"
                />
                {manualSearch && (
                  <button onClick={() => setManualSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Select/deselect all visible */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{manualFiltered.length} shown · {manualIds.length} selected</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualIds((prev) => Array.from(new Set([...prev, ...manualFiltered.map((p) => p.id)])))}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Select all shown
                  </button>
                  {manualIds.length > 0 && (
                    <button onClick={() => setManualIds([])} className="text-xs text-gray-400 hover:text-gray-600">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl max-h-64 overflow-auto divide-y divide-gray-50">
                {manualFiltered.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No papers found.</p>
                )}
                {manualFiltered.map((p) => (
                  <label key={p.id} className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors',
                    manualIds.includes(p.id) && 'bg-cyan-50',
                  )}>
                    <input
                      type="checkbox"
                      checked={manualIds.includes(p.id)}
                      onChange={() => toggleManual(p.id)}
                      className="mt-0.5 w-3.5 h-3.5 rounded accent-cyan-500 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {p.authors.slice(0, 2).join(', ')}{p.authors.length > 2 ? ' et al.' : ''}
                        {p.year ? ` · ${p.year}` : ''}
                        {p.paper_type ? ` · ${p.paper_type}` : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Step 2: Analysis Type ──────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Choose Analysis Type</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ANALYSIS_TYPES.map((type) => {
              const meta = ANALYSIS_TYPE_META[type];
              const isSelected = analysisType === type;
              return (
                <button
                  key={type}
                  onClick={() => setAnalysisType(type)}
                  className={cn(
                    'flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? `${meta.color} shadow-sm`
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm',
                  )}
                >
                  <div className={cn('p-1.5 rounded-lg', isSelected ? 'bg-white/60' : 'bg-gray-50')}>
                    {meta.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 mb-0.5">{type}</p>
                    <p className="text-xs text-gray-500 leading-snug">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── Step 3: Generate ──────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h2 className="text-sm font-semibold text-gray-800">Generate Insight</h2>
            </div>
            {result && (
              <Button
                size="sm"
                variant="outline"
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={() => setSaveOpen(true)}
              >
                Save Insight
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              loading={generating}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Generate Insight
            </Button>
            {!analysisType && (
              <span className="text-xs text-gray-400">Select an analysis type first.</span>
            )}
            {analysisType && selectedPapers.length === 0 && (
              <span className="text-xs text-gray-400">No papers match the current filters.</span>
            )}
            {analysisType && selectedPapers.length > 0 && (
              <span className="text-xs text-gray-500">
                {selectedPapers.length} paper{selectedPapers.length !== 1 ? 's' : ''} · {analysisType}
              </span>
            )}
          </div>

          {genError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 mb-4">
              {genError}
            </div>
          )}

          {generating && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-3 rounded-full bg-gray-100 animate-pulse"
                  style={{ width: `${85 - i * 8}%` }}
                />
              ))}
              <p className="text-xs text-gray-400 mt-3">Analysing {selectedPapers.length} papers…</p>
            </div>
          )}

          {result && !generating && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <FormattedResult text={result} />
            </div>
          )}

          {saveSuccess && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              Insight saved successfully.
            </div>
          )}
        </Card>
      </div>

      {/* Save dialog */}
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save Insight"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!saveTitle.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Title"
            placeholder="e.g. Topic clusters for literature review"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            autoFocus
          />
          {analysisType && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Badge variant="tag">{analysisType}</Badge>
              <span>{selectedPapers.length} papers</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
