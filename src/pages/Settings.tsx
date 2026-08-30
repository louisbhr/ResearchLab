import { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Key,
  Database,
  Info,
  Settings as SettingsIcon,
  Tag,
  Plus,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import * as api from '../services/tauriApi';
import { PAPER_TYPES } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Recommended)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (Most capable)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Settings Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { settings, loadSettings } = useAppStore();

  // API key
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Connection test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Model
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [savingModel, setSavingModel] = useState(false);

  // Paper types
  const [paperTypes, setPaperTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [savingTypes, setSavingTypes] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings?.claude_model) {
      setSelectedModel(settings.claude_model);
    }
  }, [settings?.claude_model]);

  useEffect(() => {
    if (settings?.paper_types) {
      setPaperTypes(settings.paper_types);
    }
  }, [settings?.paper_types]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveApiKey() {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setKeyMessage(null);
    setTestResult(null);
    try {
      await api.saveApiKey(apiKey.trim());
      await loadSettings();
      setApiKey('');
      setKeyMessage({ text: 'API key saved successfully.', ok: true });
    } catch (err) {
      setKeyMessage({
        text: err instanceof Error ? err.message : 'Failed to save API key.',
        ok: false,
      });
    } finally {
      setSavingKey(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await api.testApiConnection();
      setTestResult(ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveModel(model: string) {
    setSelectedModel(model);
    setSavingModel(true);
    try {
      await api.saveSetting('claude_model', model);
      await loadSettings();
    } finally {
      setSavingModel(false);
    }
  }

  async function handleAddType() {
    const trimmed = newType.trim();
    if (!trimmed || paperTypes.includes(trimmed)) return;
    const updated = [...paperTypes, trimmed];
    setSavingTypes(true);
    try {
      await api.savePaperTypes(updated);
      setPaperTypes(updated);
      setNewType('');
      await loadSettings();
    } finally {
      setSavingTypes(false);
    }
  }

  async function handleRemoveType(type: string) {
    const updated = paperTypes.filter((t) => t !== type);
    setSavingTypes(true);
    try {
      await api.savePaperTypes(updated);
      setPaperTypes(updated);
      await loadSettings();
    } finally {
      setSavingTypes(false);
    }
  }

  async function handleResetTypes() {
    const defaults = PAPER_TYPES as unknown as string[];
    setSavingTypes(true);
    try {
      await api.savePaperTypes(defaults);
      setPaperTypes([...defaults]);
      await loadSettings();
    } finally {
      setSavingTypes(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <SettingsIcon className="w-5 h-5 text-cyan-500" />
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        </div>
        <p className="text-xs text-gray-500 ml-8">
          Configure your ResearchLab workspace.
        </p>
      </div>

      <div className="flex-1 px-6 pb-6 space-y-5 max-w-2xl">

        {/* ── AI Configuration ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <div className="w-7 h-7 bg-cyan-50 rounded-lg flex items-center justify-center">
              <Key className="w-3.5 h-3.5 text-cyan-600" />
            </div>
          </CardHeader>

          <div className="space-y-5">
            {/* Key status indicator */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">API Key Status</p>
              {settings?.claude_api_key_set ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  API key is configured and active.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  No API key set. AI features are disabled.
                </div>
              )}
            </div>

            {/* API key input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">
                {settings?.claude_api_key_set ? 'Replace API Key' : 'Enter API Key'}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  loading={savingKey}
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim()}
                >
                  Save API Key
                </Button>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Your API key is stored locally on this device and is{' '}
                <span className="font-medium text-gray-500">never exported or included in backups</span>.
                Get your key at{' '}
                <span className="font-mono text-gray-500">console.anthropic.com</span>.
              </p>

              {keyMessage && (
                <p className={`text-xs font-medium ${keyMessage.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {keyMessage.text}
                </p>
              )}
            </div>

            {/* Test connection */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Connection Test</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  loading={testing}
                  onClick={handleTestConnection}
                  disabled={!settings?.claude_api_key_set}
                >
                  Test Connection
                </Button>
                {testResult === 'success' && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Connection successful
                  </span>
                )}
                {testResult === 'error' && (
                  <span className="flex items-center gap-1.5 text-xs text-red-500">
                    <XCircle className="w-3.5 h-3.5" />
                    Connection failed — check your API key
                  </span>
                )}
              </div>
            </div>

            {/* Model selector */}
            <div>
              <Select
                label="Claude Model"
                value={selectedModel}
                onChange={(e) => handleSaveModel(e.target.value)}
                options={MODELS}
                disabled={savingModel}
              />
              <p className="text-xs text-gray-400 mt-1">
                Sonnet is the best balance of quality and speed for most use cases.
              </p>
            </div>
          </div>
        </Card>

        {/* ── Local Storage ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Local Storage</CardTitle>
            <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-gray-600" />
            </div>
          </CardHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Database Path</p>
              <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-all select-all">
                {settings?.db_path ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">PDF Storage Path</p>
              <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-all select-all">
                {settings?.pdf_storage_path ?? '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* ── Paper Types ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Paper Types</CardTitle>
            <div className="w-7 h-7 bg-cyan-50 rounded-lg flex items-center justify-center">
              <Tag className="w-3.5 h-3.5 text-cyan-600" />
            </div>
          </CardHeader>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Customize the list of paper types available in dropdowns throughout the app.
            </p>

            {/* Current types */}
            <div className="flex flex-wrap gap-1.5">
              {paperTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg"
                >
                  {type}
                  <button
                    onClick={() => handleRemoveType(type)}
                    disabled={savingTypes}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {paperTypes.length === 0 && (
                <p className="text-xs text-gray-400 italic">No types defined.</p>
              )}
            </div>

            {/* Add new type */}
            <div className="flex gap-2">
              <input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                placeholder="Add a new type…"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none"
              />
              <Button
                onClick={handleAddType}
                disabled={!newType.trim() || paperTypes.includes(newType.trim()) || savingTypes}
                loading={savingTypes}
                size="sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>

            <button
              onClick={handleResetTypes}
              disabled={savingTypes}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Reset to defaults
            </button>
          </div>
        </Card>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
              <Info className="w-3.5 h-3.5 text-gray-600" />
            </div>
          </CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Application</span>
              <span className="text-sm font-medium text-gray-800">ResearchLab</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Version</span>
              <span className="text-sm font-medium text-gray-800 font-mono">
                {settings?.app_version ?? '1.0.0'}
              </span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500 leading-relaxed">
                ResearchLab is a local-first research paper manager. All your data stays on your
                device — no account required, no cloud sync, no tracking. Your research, your
                control.
              </p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
