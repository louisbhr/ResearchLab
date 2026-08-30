import { useState } from "react";
import { X, Edit, Save, RotateCcw, ExternalLink, FileText, Heart, Brain, Plus } from "lucide-react";
import { Paper, PaperTag, Tag, PAPER_TYPES, READING_STATUSES } from "../../types";
import { ReadingStatusBadge, PaperTypeBadge, Badge } from "../ui/Badge";
import { RatingBar } from "../ui/RatingBar";
import { Button } from "../ui/Button";
import { Input, Textarea, Select } from "../ui/Input";
import { useAppStore } from "../../store/useAppStore";
import * as api from "../../services/tauriApi";
import { formatAuthors } from "../../utils";

function EditTagsSection({
  paperTags,
  allTags,
  onChange,
}: {
  paperTags: PaperTag[];
  allTags: Tag[];
  onChange: (tags: PaperTag[]) => void;
}) {
  const { loadTags } = useAppStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const paperTagIds = new Set(paperTags.map((t) => t.tag_id));

  const toggleTag = (tag: Tag) => {
    if (paperTagIds.has(tag.id)) {
      onChange(paperTags.filter((t) => t.tag_id !== tag.id));
    } else {
      onChange([...paperTags, { tag_id: tag.id, tag_name: tag.name, rating: 3, ai_suggested: false, user_confirmed: true }]);
    }
  };

  const updateRating = (tagId: string, rating: number) => {
    onChange(paperTags.map((t) => t.tag_id === tagId ? { ...t, rating } : t));
  };

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const trimmed = search.trim();
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !exactMatch;

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const newTag = await api.createTag({ name: trimmed });
      await loadTags();
      onChange([...paperTags, { tag_id: newTag.id, tag_name: newTag.name, rating: 3, ai_suggested: false, user_confirmed: true }]);
      setSearch('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Current tags with rating */}
      {paperTags.length > 0 && (
        <div className="space-y-2 mb-3">
          {paperTags.map((tag) => (
            <div key={tag.tag_id} className="flex items-center gap-2">
              <span className="text-xs text-gray-700 w-24 shrink-0 truncate">{tag.tag_name}</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <button
                    key={i}
                    onClick={() => updateRating(tag.tag_id, i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= tag.rating ? 'bg-cyan-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => onChange(paperTags.filter((t) => t.tag_id !== tag.tag_id))}
                className="ml-auto p-0.5 text-gray-300 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Tag selector */}
      <div className="flex gap-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
          placeholder="Search or create tag…"
          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-cyan-300"
        />
        {canCreate && (
          <button
            onClick={handleCreate}
            disabled={creating}
            title={`Create tag "${trimmed}"`}
            className="px-2 py-1.5 text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      {search && (
        <div className="border border-gray-100 rounded-lg max-h-32 overflow-auto">
          {filtered.slice(0, 8).map((tag) => (
            <button
              key={tag.id}
              onClick={() => { toggleTag(tag); setSearch(''); }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-gray-50"
            >
              <span className={paperTagIds.has(tag.id) ? 'font-medium text-cyan-700' : 'text-gray-700'}>
                {tag.name}
              </span>
              {paperTagIds.has(tag.id) && <span className="text-cyan-500 text-[10px]">✓</span>}
            </button>
          ))}
          {filtered.length === 0 && !canCreate && <p className="text-xs text-gray-400 px-2.5 py-1.5">No matching tags</p>}
        </div>
      )}
    </div>
  );
}

interface PaperDetailViewProps {
  paper?: Paper;
  open?: boolean;
  onClose: () => void;
}

export default function PaperDetailView({ paper: paperProp, open = true, onClose }: PaperDetailViewProps) {
  const { papers, selectedPaperId } = useAppStore();
  const paper = paperProp || papers.find(p => p.id === selectedPaperId);
  if (!open || !paper) return null;
  const { updatePaper, tags, projects, settings } = useAppStore();
  const paperTypes = settings?.paper_types ?? (PAPER_TYPES as unknown as string[]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ ...paper });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePaper({
        id: paper.id,
        title: editData.title,
        doi: editData.doi,
        authors: editData.authors,
        year: editData.year,
        journal: editData.journal,
        abstract_text: editData.abstract_text,
        paper_type: editData.paper_type,
        reading_status: editData.reading_status,
        relevance_rating: editData.relevance_rating,
        favorite: editData.favorite,
        personal_notes: editData.personal_notes,
        short_summary: editData.short_summary,
        key_findings: editData.key_findings,
        tags: editData.tags,
        project_ids: editData.project_ids,
      });
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({ ...paper });
    setEditing(false);
  };

  const handleToggleFavorite = async () => {
    await updatePaper({ id: paper.id, favorite: !paper.favorite });
  };

  const authorStr = formatAuthors(paper.authors);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto bg-white w-full max-w-4xl shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {editing ? (
              <Input
                value={editData.title}
                onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                className="text-base font-semibold"
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-800 leading-snug">{paper.title}</h2>
            )}
            {editing ? (
              <Input
                label="Authors (comma-separated)"
                value={Array.isArray(editData.authors) ? editData.authors.join(", ") : ""}
                onChange={e => setEditData(d => ({ ...d, authors: e.target.value.split(",").map((a: string) => a.trim()).filter(Boolean) }))}
                placeholder="Smith J, Jones A, ..."
                className="mt-2 text-sm"
              />
            ) : (
              <p className="text-sm text-gray-500 mt-1">{authorStr}</p>
            )}
            {paper.year && <span className="text-xs text-gray-400">{paper.year}</span>}
            {paper.journal && (
              <span className="text-xs text-gray-500 ml-2">· {paper.journal}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-lg transition-colors ${
                paper.favorite ? "text-amber-500 bg-amber-50" : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              <Heart className="w-4 h-4" fill={paper.favorite ? "currentColor" : "none"} />
            </button>
            {!editing ? (
              <Button variant="outline" size="sm" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                  Cancel
                </Button>
                <Button size="sm" loading={saving} icon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
                  Save
                </Button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 shrink-0 overflow-x-auto">
          <ReadingStatusBadge status={paper.reading_status} />
          {paper.paper_type && <PaperTypeBadge type={paper.paper_type} />}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Relevance:</span>
            {editing ? (
              <div className="flex gap-0.5 items-center">
                {[1,2,3,4,5].map(i => (
                  <button
                    key={i}
                    onClick={() => setEditData(d => ({ ...d, relevance_rating: i === d.relevance_rating ? 0 : i }))}
                    className={`w-3 h-3 rounded-full transition-colors ${i <= (editData.relevance_rating || 0) ? 'bg-cyan-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < (paper.relevance_rating || 0) ? "bg-cyan-500" : "bg-gray-200"}`} />
                ))}
              </div>
            )}
          </div>
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              DOI
            </a>
          )}
          {paper.pdf_path && (
            <button
              onClick={() => api.openPdf(paper.pdf_path!)}
              className="flex items-center gap-1 text-xs text-cyan-600 hover:underline"
            >
              <FileText className="w-3 h-3" />
              Open PDF
            </button>
          )}
        </div>

        {/* Body - two column */}
        <div className="flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Main content */}
            <div className="flex-1 p-5 space-y-5 overflow-auto">
              {/* Edit mode fields */}
              {editing && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="DOI"
                    value={editData.doi || ""}
                    onChange={e => setEditData(d => ({ ...d, doi: e.target.value }))}
                    placeholder="10.xxx/xxx"
                  />
                  <Input
                    label="Year"
                    type="number"
                    value={editData.year || ""}
                    onChange={e => setEditData(d => ({ ...d, year: parseInt(e.target.value) || undefined }))}
                  />
                  <Input
                    label="Journal"
                    value={editData.journal || ""}
                    onChange={e => setEditData(d => ({ ...d, journal: e.target.value }))}
                    className="col-span-2"
                  />
                  <Select
                    label="Reading Status"
                    value={editData.reading_status}
                    onChange={e => setEditData(d => ({ ...d, reading_status: e.target.value }))}
                    options={READING_STATUSES.map(s => ({ value: s, label: s }))}
                  />
                  <Select
                    label="Paper Type"
                    value={editData.paper_type || ""}
                    onChange={e => setEditData(d => ({ ...d, paper_type: e.target.value }))}
                    options={[{ value: "", label: "— Select type —" }, ...paperTypes.map(t => ({ value: t, label: t }))]}
                  />
                </div>
              )}

              {/* Abstract */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Abstract</h4>
                {editing ? (
                  <Textarea
                    value={editData.abstract_text || ""}
                    onChange={e => setEditData(d => ({ ...d, abstract_text: e.target.value }))}
                    rows={5}
                  />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {paper.abstract_text || <span className="text-gray-400 italic">No abstract available.</span>}
                  </p>
                )}
              </div>

              {/* AI Summary */}
              {(paper.short_summary || paper.ai_analysis_status === "Complete") && (
                <div className="bg-cyan-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-cyan-600" />
                    <h4 className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">AI Summary</h4>
                  </div>
                  {editing ? (
                    <Textarea
                      value={editData.short_summary || ""}
                      onChange={e => setEditData(d => ({ ...d, short_summary: e.target.value }))}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">{paper.short_summary}</p>
                  )}
                </div>
              )}

              {/* Key Findings */}
              {(paper.key_findings?.length || 0) > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Findings</h4>
                  <ul className="space-y-1.5">
                    {paper.key_findings?.map((finding, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Personal Notes */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Personal Notes</h4>
                {editing ? (
                  <Textarea
                    value={editData.personal_notes || ""}
                    onChange={e => setEditData(d => ({ ...d, personal_notes: e.target.value }))}
                    placeholder="Add your notes..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {paper.personal_notes || <span className="text-gray-400 italic">No notes added.</span>}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h4>
                {editing ? (
                  <EditTagsSection
                    paperTags={editData.tags}
                    allTags={tags}
                    onChange={newTags => setEditData(d => ({ ...d, tags: newTags }))}
                  />
                ) : (
                  paper.tags.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No tags assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {paper.tags.map(tag => (
                        <div key={tag.tag_id} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-700 w-28 shrink-0">{tag.tag_name}</span>
                          <div className="flex-1">
                            <RatingBar rating={tag.rating} showLabel />
                          </div>
                          {tag.ai_suggested && !tag.user_confirmed && (
                            <Badge variant="tag" className="text-[10px]">AI</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Sidebar - AI status + actions */}
            <div className="w-52 border-l border-gray-100 p-4 space-y-4 shrink-0 bg-gray-50">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Analysis</p>
                <div className={`flex items-center gap-1.5 text-xs ${
                  paper.ai_analysis_status === "Complete" ? "text-emerald-600" :
                  paper.ai_analysis_status === "Failed" ? "text-red-500" : "text-gray-500"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    paper.ai_analysis_status === "Complete" ? "bg-emerald-500" :
                    paper.ai_analysis_status === "Failed" ? "bg-red-500" : "bg-gray-300"
                  }`} />
                  {paper.ai_analysis_status}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Source</p>
                <Badge variant="source">{paper.source_type}</Badge>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Projects</p>
                {editing ? (
                  <div className="space-y-1">
                    {projects.map(proj => (
                      <label key={proj.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editData.project_ids?.includes(proj.id) ?? false}
                          onChange={e => {
                            const ids = editData.project_ids || [];
                            setEditData(d => ({
                              ...d,
                              project_ids: e.target.checked
                                ? [...ids, proj.id]
                                : ids.filter(id => id !== proj.id),
                            }));
                          }}
                          className="w-3 h-3 rounded accent-cyan-500"
                        />
                        <span className="text-xs text-gray-600 truncate">{proj.name}</span>
                      </label>
                    ))}
                    {projects.length === 0 && <p className="text-xs text-gray-400">No projects yet.</p>}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {paper.project_ids.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">None</p>
                    ) : (
                      paper.project_ids.map(pid => {
                        const proj = projects.find(p => p.id === pid);
                        return (
                          <div key={pid} className="text-xs text-gray-600">· {proj?.name ?? pid}</div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
