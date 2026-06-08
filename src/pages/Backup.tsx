import { useState, useEffect } from 'react';
import { save, open } from '@tauri-apps/plugin-dialog';
import {
  Archive,
  FileDown,
  FileUp,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  Key,
  Database,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import * as api from '../services/tauriApi';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../utils';
import type { BackupManifest } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ManifestRow({ label, value }: { label: string; value: string | number | boolean }) {
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{display}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Backup Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Backup() {
  const { settings, loadSettings } = useAppStore();

  const [dataDir, setDataDir] = useState<string | null>(null);
  const [backupDir, setBackupDir] = useState<string | null>(null);

  // Create backup state
  const [creatingBackup, setCreatingBackup] = useState<'no-pdfs' | 'with-pdfs' | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Restore state
  const [selectedRestorePath, setSelectedRestorePath] = useState<string | null>(null);
  const [manifest, setManifest] = useState<BackupManifest | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    api.getDataDir().then(setDataDir).catch(() => {});
    api.getBackupDir().then(setBackupDir).catch(() => {});
  }, [loadSettings]);

  // ── Create backup ─────────────────────────────────────────────────────────

  async function handleCreateBackup(includePdfs: boolean) {
    setCreatingBackup(includePdfs ? 'with-pdfs' : 'no-pdfs');
    setCreateSuccess(null);
    setCreateError(null);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const defaultName = `researchlab-backup-${timestamp}${includePdfs ? '-with-pdfs' : ''}.zip`;
      const destPath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      });
      if (!destPath) return;
      const result = await api.createBackup(destPath, includePdfs);
      setCreateSuccess(`Backup saved to: ${result}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingBackup(null);
    }
  }

  // ── Select restore file ───────────────────────────────────────────────────

  async function handleSelectRestoreFile() {
    setInspectError(null);
    setManifest(null);
    setRestoreSuccess(false);
    setRestoreError(null);
    setSelectedRestorePath(null);
    try {
      const selected = await open({
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        multiple: false,
      });
      if (!selected || Array.isArray(selected)) return;
      setSelectedRestorePath(selected);
      setInspecting(true);
      try {
        const m = await api.inspectBackup(selected);
        setManifest(m);
      } catch (err) {
        setInspectError(err instanceof Error ? err.message : String(err));
        setSelectedRestorePath(null);
      } finally {
        setInspecting(false);
      }
    } catch {
      // dialog closed
    }
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  async function handleRestore() {
    if (!selectedRestorePath) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      await api.restoreBackup(selectedRestorePath);
      setRestoreSuccess(true);
      setConfirmOpen(false);
      setManifest(null);
      setSelectedRestorePath(null);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : String(err));
      setConfirmOpen(false);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Archive className="w-5 h-5 text-cyan-500" />
          <h1 className="text-xl font-bold text-gray-800">Backup & Restore</h1>
        </div>
        <p className="text-xs text-gray-500 ml-8">
          Export your library to a zip file and restore it when needed.
        </p>
      </div>

      <div className="flex-1 px-6 pb-6 space-y-6 max-w-3xl">

        {/* ── Create Backup ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Create Backup</h2>

          {/* API key note */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 mb-4">
            <Key className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Your API key is stored separately and is{' '}
              <span className="font-semibold">never included</span> in backups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Without PDFs */}
            <Card className="flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                  <FileDown className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">Backup without PDFs</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Exports all papers, tags, projects, and insights as a compact ZIP. PDF files are
                    not included — keeping the backup small and fast.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4 italic">
                Typical size: a few KB to a few MB depending on library size.
              </p>
              <Button
                onClick={() => handleCreateBackup(false)}
                loading={creatingBackup === 'no-pdfs'}
                icon={<FileDown className="w-4 h-4" />}
                className="self-start mt-auto"
              >
                Create Backup
              </Button>
            </Card>

            {/* With PDFs */}
            <Card className="flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">Backup with PDFs</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Includes all PDF files in addition to library data. Creates a complete archive
                    for migration or full recovery.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4 italic">
                Size varies — can be hundreds of MB if you have many PDFs.
              </p>
              <Button
                variant="secondary"
                onClick={() => handleCreateBackup(true)}
                loading={creatingBackup === 'with-pdfs'}
                icon={<HardDrive className="w-4 h-4" />}
                className="self-start mt-auto"
              >
                Create Backup
              </Button>
            </Card>
          </div>

          {createSuccess && (
            <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{createSuccess}</span>
            </div>
          )}
          {createError && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {createError}
            </div>
          )}
        </section>

        {/* ── Restore Backup ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Restore Backup</h2>
          <Card>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <FileUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">Select Backup File</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Choose a previously created ResearchLab backup ZIP to inspect and restore from.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleSelectRestoreFile}
              loading={inspecting}
              icon={<FolderOpen className="w-4 h-4" />}
            >
              Browse for Backup...
            </Button>

            {inspectError && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                {inspectError}
              </div>
            )}

            {manifest && selectedRestorePath && (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Backup Contents
                  </p>
                  <ManifestRow label="Backup Version" value={manifest.version} />
                  <ManifestRow label="Created" value={formatDate(manifest.created_at)} />
                  <ManifestRow label="Papers" value={manifest.paper_count} />
                  <ManifestRow label="Tags" value={manifest.tag_count} />
                  <ManifestRow label="Projects" value={manifest.project_count} />
                  <ManifestRow label="Insights" value={manifest.insight_count} />
                  <ManifestRow label="Includes PDFs" value={manifest.includes_pdfs} />
                </div>

                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <span className="font-semibold">Warning:</span> Restoring will overwrite your
                    current library data. This action cannot be undone. Create a backup of your
                    current data first if needed.
                  </p>
                </div>

                <Button
                  variant="destructive"
                  icon={<FileUp className="w-4 h-4" />}
                  onClick={() => setConfirmOpen(true)}
                >
                  Restore Backup
                </Button>
              </div>
            )}

            {restoreSuccess && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Backup restored successfully. Please restart the app to reload your data.
              </div>
            )}

            {restoreError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                Restore failed: {restoreError}
              </div>
            )}
          </Card>
        </section>

        {/* ── Storage Info ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Storage Locations</h2>
          <Card>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Database Path
                </p>
                <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-all">
                  {settings?.db_path ?? dataDir ?? 'Loading…'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">PDF Storage Path</p>
                <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-all">
                  {settings?.pdf_storage_path ?? 'Loading…'}
                </p>
              </div>
              {backupDir && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Backup Directory</p>
                  <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-all">
                    {backupDir}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>

      </div>

      {/* Restore confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Restore"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestore} loading={restoring}>
              Yes, Restore
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This will permanently replace your current library with the backup contents.
              All current papers, tags, projects, and insights will be lost.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to restore this backup?
          </p>
        </div>
      </Modal>
    </div>
  );
}
