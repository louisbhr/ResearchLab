import { useState } from "react";
import { Search, Upload, PenLine, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Textarea, Select } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { ImportPreview, DuplicateCandidate, PAPER_TYPES, READING_STATUSES } from "../../types";
import * as api from "../../services/tauriApi";
import { analyzeImportedPaper } from "../../services/aiService";
import { useAppStore } from "../../store/useAppStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

type Tab = "doi" | "pdf" | "manual";
type Step = "input" | "preview" | "confirm";

interface AddPaperDialogProps {
  open?: boolean;
  onClose: () => void;
}

export default function AddPaperDialog({ open = true, onClose }: AddPaperDialogProps) {
  if (!open) return null;
  const [tab, setTab] = useState<Tab>("doi");
  const [step, setStep] = useState<Step>("input");
  const { createPaper, tags, settings, loadPapers, loadTags, activeProjectId } = useAppStore();

  // DOI state
  const [doi, setDoi] = useState("");
  const [doiLoading, setDoiLoading] = useState(false);

  // Shared preview state
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewEdits, setPreviewEdits] = useState<Partial<ImportPreview>>({});

  // Manual entry state
  const [manual, setManual] = useState({
    title: "", doi: "", authors: "", year: "", journal: "", abstract_text: "",
    paper_type: "", reading_status: "Unread", relevance_rating: 3, personal_notes: ""
  });

  // AI analysis
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mergedPreview = { ...preview, ...previewEdits } as ImportPreview;

  const handleDoiSearch = async () => {
    if (!doi.trim()) return;
    setDoiLoading(true);
    setError(null);
    try {
      const p = await api.fetchDoiPreview(doi.trim());
      setPreview(p);
      setStep("preview");
      if (settings?.claude_api_key_set && p.title) {
        handleRunAI(p.title, p.abstract_text || "", p.authors || [], p.year, p.journal);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch DOI metadata.");
    } finally {
      setDoiLoading(false);
    }
  };

  const handlePdfUpload = async () => {
    try {
      const selected = await openDialog({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        multiple: false,
      });
      if (!selected || typeof selected !== "string") return;
      const p = await api.parsePdf(selected);
      setPreview(p);
      setStep("preview");
      if (settings?.claude_api_key_set && p.title) {
        handleRunAI(p.title, p.abstract_text || "", p.authors || [], p.year, p.journal);
      }
    } catch (e: any) {
      setError(e.message || "Failed to process PDF.");
    }
  };

  const handleRunAI = async (titleVal: string, abstractVal: string, authors: string[], year?: number | null, journal?: string | null) => {
    if (!settings?.claude_api_key_set) return;
    setAiLoading(true);
    try {
      const result = await analyzeImportedPaper({ title: titleVal, abstract_text: abstractVal, authors, year: year ?? mergedPreview.year, journal: journal ?? mergedPreview.journal }, tags);
      setAiResult(result);
    } catch (e) {
      console.error("AI analysis failed:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setSaving(true);
    setError(null);
    try {
      const p = tab === "manual" ? null : mergedPreview;
      const title = tab === "manual" ? manual.title : (p?.title || "");
      if (!title) { setError("Title is required."); setSaving(false); return; }

      const authorList = tab === "manual"
        ? manual.authors.split(",").map(a => a.trim()).filter(Boolean)
        : (p?.authors || []);

      const tagInputs = aiResult?.tags?.map((t: any) => ({
        tag_name: t.name,
        rating: t.rating,
        ai_suggested: true,
        user_confirmed: false,
        reason: t.reason,
      })) || [];

      await createPaper({
        title,
        doi: tab === "manual" ? manual.doi || undefined : p?.doi || undefined,
        authors: authorList,
        year: tab === "manual" ? parseInt(manual.year) || undefined : p?.year || undefined,
        journal: tab === "manual" ? manual.journal || undefined : p?.journal || undefined,
        abstract_text: tab === "manual" ? manual.abstract_text || undefined : p?.abstract_text || undefined,
        pdf_path: p?.pdf_path || undefined,
        source_type: tab === "doi" ? "DOI" : tab === "pdf" ? "PDF" : "Manual",
        paper_type: aiResult?.paperType || (tab === "manual" ? manual.paper_type || undefined : undefined),
        reading_status: tab === "manual" ? manual.reading_status : "Unread",
        relevance_rating: aiResult?.relevanceSuggestion || (tab === "manual" ? manual.relevance_rating : undefined),
        short_summary: aiResult?.shortSummary || undefined,
        key_findings: aiResult?.keyFindings || undefined,
        tags: tagInputs,
        ai_analysis_status: aiResult ? "Complete" : "Pending",
        favorite: false,
        personal_notes: tab === "manual" ? manual.personal_notes || undefined : undefined,
        project_ids: activeProjectId !== 'all' ? [activeProjectId] : [],
      });

      await loadPapers();
      await loadTags();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save paper.");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "doi", label: "Import by DOI", icon: <Search className="w-4 h-4" /> },
    { key: "pdf", label: "Upload PDF", icon: <Upload className="w-4 h-4" /> },
    { key: "manual", label: "Manual Entry", icon: <PenLine className="w-4 h-4" /> },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Paper"
      size="xl"
      footer={
        step === "preview" || tab === "manual" ? (
          <>
            <Button variant="secondary" onClick={() => { setStep("input"); setError(null); }}>Back</Button>
            {!aiResult && !aiLoading && settings?.claude_api_key_set && (
              <Button
                variant="outline"
                loading={aiLoading}
                icon={<span className="text-cyan-500">✦</span>}
                onClick={() => handleRunAI(
                  mergedPreview.title || "",
                  mergedPreview.abstract_text || "",
                  mergedPreview.authors || []
                )}
              >
                Run AI Analysis
              </Button>
            )}
            <Button loading={saving} onClick={handleConfirmImport}>
              Save Paper
            </Button>
          </>
        ) : null
      }
    >
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-600 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tab switcher — only show on input step */}
      {step === "input" && (
        <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* DOI Tab */}
      {step === "input" && tab === "doi" && (
        <div className="space-y-4">
          <Input
            label="Enter DOI"
            value={doi}
            onChange={e => setDoi(e.target.value)}
            placeholder="10.1000/xyz123 or https://doi.org/..."
            onKeyDown={e => e.key === "Enter" && handleDoiSearch()}
          />
          <Button loading={doiLoading} onClick={handleDoiSearch} className="w-full">
            Search Paper
          </Button>
          {!settings?.claude_api_key_set && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              AI analysis is disabled. Add a Claude API key in Settings to enable automatic paper analysis.
            </p>
          )}
        </div>
      )}

      {/* PDF Tab */}
      {step === "input" && tab === "pdf" && (
        <div className="space-y-4">
          <div
            onClick={handlePdfUpload}
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Click to select a PDF file</p>
              <p className="text-xs text-gray-400 mt-1">The PDF will be analyzed and stored locally</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Tab */}
      {tab === "manual" && (
        <div className="space-y-3">
          <Input label="Title *" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="DOI" value={manual.doi} onChange={e => setManual(m => ({ ...m, doi: e.target.value }))} />
            <Input label="Year" type="number" value={manual.year} onChange={e => setManual(m => ({ ...m, year: e.target.value }))} />
          </div>
          <Input label="Authors (comma-separated)" value={manual.authors} onChange={e => setManual(m => ({ ...m, authors: e.target.value }))} placeholder="Smith J, Jones A, ..." />
          <Input label="Journal" value={manual.journal} onChange={e => setManual(m => ({ ...m, journal: e.target.value }))} />
          <Textarea label="Abstract" value={manual.abstract_text} onChange={e => setManual(m => ({ ...m, abstract_text: e.target.value }))} rows={4} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Paper Type"
              value={manual.paper_type}
              onChange={e => setManual(m => ({ ...m, paper_type: e.target.value }))}
              options={[{ value: "", label: "— Select —" }, ...PAPER_TYPES.map(t => ({ value: t, label: t }))]}
            />
            <Select
              label="Reading Status"
              value={manual.reading_status}
              onChange={e => setManual(m => ({ ...m, reading_status: e.target.value }))}
              options={READING_STATUSES.map(s => ({ value: s, label: s }))}
            />
          </div>
          <Textarea label="Personal Notes" value={manual.personal_notes} onChange={e => setManual(m => ({ ...m, personal_notes: e.target.value }))} rows={2} />
          {!settings?.claude_api_key_set && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              AI analysis disabled. Add your Claude API key in Settings.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            {settings?.claude_api_key_set && (
              <Button
                variant="outline"
                loading={aiLoading}
                onClick={() => handleRunAI(manual.title, manual.abstract_text, manual.authors.split(",").map(a => a.trim()))}
              >
                Run AI Analysis
              </Button>
            )}
            <Button className="flex-1" loading={saving} onClick={handleConfirmImport}>Save Paper</Button>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === "preview" && mergedPreview && (
        <ImportPreviewPanel
          preview={mergedPreview}
          edits={previewEdits}
          onEdit={updates => setPreviewEdits(e => ({ ...e, ...updates }))}
          aiResult={aiResult}
          aiLoading={aiLoading}
        />
      )}
    </Modal>
  );
}

function ImportPreviewPanel({
  preview,
  edits,
  onEdit,
  aiResult,
  aiLoading,
}: {
  preview: ImportPreview;
  edits: Partial<ImportPreview>;
  onEdit: (updates: Partial<ImportPreview>) => void;
  aiResult: any;
  aiLoading: boolean;
}) {
  const merged = { ...preview, ...edits };

  return (
    <div className="space-y-4">
      {/* Completeness status */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-700">Import Review</p>
        {preview.duplicate_candidates?.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Possible duplicate detected</p>
              {preview.duplicate_candidates.map(d => (
                <p key={d.paper_id} className="mt-0.5">"{d.title}" — {d.reason}</p>
              ))}
            </div>
          </div>
        )}
        {preview.missing_fields.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-red-600">
            <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Missing: {preview.missing_fields.join(", ")}</span>
          </div>
        )}
        {preview.uncertain_fields.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Uncertain: {preview.uncertain_fields.join(", ")}</span>
          </div>
        )}
        {preview.missing_fields.length === 0 && preview.uncertain_fields.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
            All key fields found.
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div className="space-y-3">
        <Input
          label="Title"
          value={merged.title || ""}
          onChange={e => onEdit({ title: e.target.value })}
        />
        <Input
          label="Authors (comma-separated)"
          value={Array.isArray(merged.authors) ? merged.authors.join(", ") : ""}
          onChange={e => onEdit({ authors: e.target.value.split(",").map((a: string) => a.trim()).filter(Boolean) })}
          placeholder="Smith J, Jones A, ..."
        />
        <Input
          label="DOI"
          value={merged.doi || ""}
          onChange={e => onEdit({ doi: e.target.value })}
          placeholder="10.xxx/xxx"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Year" type="number" value={merged.year || ""} onChange={e => onEdit({ year: parseInt(e.target.value) || undefined })} />
          <Input label="Journal" value={merged.journal || ""} onChange={e => onEdit({ journal: e.target.value })} />
        </div>
        <Textarea label="Abstract" value={merged.abstract_text || ""} onChange={e => onEdit({ abstract_text: e.target.value })} rows={4} />
      </div>

      {/* AI result preview */}
      {aiLoading && (
        <div className="flex items-center gap-2 text-sm text-cyan-600 bg-cyan-50 rounded-lg p-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Running AI analysis...
        </div>
      )}
      {aiResult && (
        <div className="bg-cyan-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-cyan-700">✦ AI Analysis Complete</p>
          {aiResult.paperType && <p className="text-xs text-gray-600">Type: <strong>{aiResult.paperType}</strong></p>}
          {aiResult.shortSummary && <p className="text-xs text-gray-600 leading-relaxed">{aiResult.shortSummary}</p>}
          {aiResult.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {aiResult.tags.map((t: any, i: number) => (
                <span key={i} className="text-xs bg-white px-2 py-0.5 rounded-full text-cyan-700 border border-cyan-200">
                  {t.name} ({t.rating}/5)
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
