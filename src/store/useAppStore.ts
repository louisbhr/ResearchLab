import { create } from 'zustand';
import type {
  Paper,
  Tag,
  Project,
  Insight,
  AppSettings,
  PaperFilter,
  CreatePaperInput,
  UpdatePaperInput,
  CreateProjectInput,
  CreateInsightInput,
} from '../types';
import {
  getPapers,
  getTags,
  getProjects,
  getInsights,
  getSettings,
  createPaper as apiCreatePaper,
  updatePaper as apiUpdatePaper,
  deletePaper as apiDeletePaper,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  createInsight as apiCreateInsight,
  deleteInsight as apiDeleteInsight,
} from '../services/tauriApi';

// ─────────────────────────────────────────────────────────────────────────────
// Default filter
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTER: PaperFilter = {
  project_id: null,
  tag_ids: null,
  reading_status: null,
  paper_type: null,
  year_from: null,
  year_to: null,
  relevance_min: null,
  relevance_max: null,
  favorite_only: null,
  search_query: null,
  sort_by: 'date_added',
  sort_desc: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface AppState {
  // Data
  papers: Paper[];
  tags: Tag[];
  projects: Project[];
  insights: Insight[];
  settings: AppSettings | null;

  // UI state
  loading: boolean;
  error: string | null;
  activeProjectId: string;
  selectedPaperId: string | null;
  filter: PaperFilter;

  // ── Computed helpers ────────────────────────────────────────────────────────
  /** Return the currently selected paper object, or null. */
  selectedPaper: () => Paper | null;

  /** Return papers belonging to the active project, respecting the current filter. */
  filteredPapers: () => Paper[];

  // ── Loaders ─────────────────────────────────────────────────────────────────
  loadPapers: (filter?: PaperFilter) => Promise<void>;
  loadTags: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadInsights: () => Promise<void>;
  loadSettings: () => Promise<void>;

  /** Load all primary data in parallel. */
  loadAll: () => Promise<void>;

  // ── UI mutations ─────────────────────────────────────────────────────────────
  setActiveProject: (id: string) => void;
  setFilter: (filter: Partial<PaperFilter>) => void;
  resetFilter: () => void;
  setSelectedPaper: (id: string | null) => void;
  clearError: () => void;

  // ── Paper mutations ──────────────────────────────────────────────────────────
  createPaper: (input: CreatePaperInput) => Promise<Paper>;
  updatePaper: (input: UpdatePaperInput) => Promise<Paper>;
  deletePaper: (id: string) => Promise<void>;

  // ── Project mutations ────────────────────────────────────────────────────────
  createProject: (input: CreateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // ── Insight mutations ────────────────────────────────────────────────────────
  createInsight: (input: CreateInsightInput) => Promise<Insight>;
  deleteInsight: (id: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
  papers: [],
  tags: [],
  projects: [],
  insights: [],
  settings: null,
  loading: false,
  error: null,
  activeProjectId: 'all',
  selectedPaperId: null,
  filter: { ...DEFAULT_FILTER },

  // ── Computed helpers ─────────────────────────────────────────────────────────

  selectedPaper: () => {
    const { papers, selectedPaperId } = get();
    if (!selectedPaperId) return null;
    return papers.find((p) => p.id === selectedPaperId) ?? null;
  },

  filteredPapers: () => {
    // The backend already applies the filter when loadPapers is called,
    // so this just returns the already-filtered papers list. It exists as
    // a convenient accessor that components can call without knowing the detail.
    return get().papers;
  },

  // ── Loaders ──────────────────────────────────────────────────────────────────

  loadPapers: async (filter?: PaperFilter) => {
    set({ loading: true, error: null });
    try {
      const effectiveFilter = filter ?? get().filter;
      // If activeProjectId is not 'all', inject it into the filter
      const projectId = get().activeProjectId;
      const resolvedFilter: PaperFilter = {
        ...effectiveFilter,
        project_id: projectId === 'all' ? null : projectId,
      };
      const papers = await getPapers(resolvedFilter);
      set({ papers, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, loading: false });
    }
  },

  loadTags: async () => {
    try {
      const tags = await getTags();
      set({ tags });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  loadProjects: async () => {
    try {
      const projects = await getProjects();
      set({ projects });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  loadInsights: async () => {
    try {
      const insights = await getInsights();
      set({ insights });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  loadSettings: async () => {
    try {
      const settings = await getSettings();
      set({ settings });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [papers, tags, projects, insights, settings] = await Promise.all([
        getPapers((() => {
          const { filter, activeProjectId } = get();
          return {
            ...filter,
            project_id: activeProjectId === 'all' ? null : activeProjectId,
          };
        })()),
        getTags(),
        getProjects(),
        getInsights(),
        getSettings(),
      ]);
      set({ papers, tags, projects, insights, settings, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, loading: false });
    }
  },

  // ── UI mutations ──────────────────────────────────────────────────────────────

  setActiveProject: (id: string) => {
    set({ activeProjectId: id });
    // Re-fetch papers filtered by the new project
    const { filter } = get();
    const resolvedFilter: PaperFilter = {
      ...filter,
      project_id: id === 'all' ? null : id,
    };
    get().loadPapers(resolvedFilter);
  },

  setFilter: (partial: Partial<PaperFilter>) => {
    const newFilter: PaperFilter = { ...get().filter, ...partial };
    set({ filter: newFilter });
    get().loadPapers(newFilter);
  },

  resetFilter: () => {
    const reset = { ...DEFAULT_FILTER };
    set({ filter: reset });
    get().loadPapers(reset);
  },

  setSelectedPaper: (id: string | null) => {
    set({ selectedPaperId: id });
  },

  clearError: () => {
    set({ error: null });
  },

  // ── Paper mutations ────────────────────────────────────────────────────────────

  createPaper: async (input: CreatePaperInput): Promise<Paper> => {
    set({ loading: true, error: null });
    try {
      const created = await apiCreatePaper(input);
      set((state) => ({
        papers: [created, ...state.papers],
        loading: false,
      }));
      // Refresh tags since a new paper may have introduced new ones
      get().loadTags();
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  updatePaper: async (input: UpdatePaperInput): Promise<Paper> => {
    set({ error: null });
    try {
      const updated = await apiUpdatePaper(input);
      set((state) => ({
        papers: state.papers.map((p) => (p.id === updated.id ? updated : p)),
      }));
      // Update selectedPaper reference if it was the paper being edited
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },

  deletePaper: async (id: string): Promise<void> => {
    set({ error: null });
    try {
      await apiDeletePaper(id);
      set((state) => ({
        papers: state.papers.filter((p) => p.id !== id),
        // Deselect if the deleted paper was selected
        selectedPaperId: state.selectedPaperId === id ? null : state.selectedPaperId,
      }));
      get().loadTags();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },

  // ── Project mutations ──────────────────────────────────────────────────────────

  createProject: async (input: CreateProjectInput): Promise<Project> => {
    set({ error: null });
    try {
      const created = await apiCreateProject(input);
      set((state) => ({
        projects: [...state.projects, created],
      }));
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },

  deleteProject: async (id: string): Promise<void> => {
    set({ error: null });
    try {
      await apiDeleteProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        // If the deleted project was active, reset to 'all'
        activeProjectId: state.activeProjectId === id ? 'all' : state.activeProjectId,
      }));
      // Reload papers since project membership changed
      get().loadPapers();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },

  // ── Insight mutations ──────────────────────────────────────────────────────────

  createInsight: async (input: CreateInsightInput): Promise<Insight> => {
    set({ error: null });
    try {
      const created = await apiCreateInsight(input);
      set((state) => ({
        insights: [created, ...state.insights],
      }));
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },

  deleteInsight: async (id: string): Promise<void> => {
    set({ error: null });
    try {
      await apiDeleteInsight(id);
      set((state) => ({
        insights: state.insights.filter((i) => i.id !== id),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Convenience selector hooks
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the paper currently selected in the list panel, or null. */
export const useSelectedPaper = (): Paper | null =>
  useAppStore((s) => s.selectedPaper());

/** Returns the current list of papers (already filtered by the backend). */
export const usePapers = (): Paper[] => useAppStore((s) => s.papers);

/** Returns the current list of tags ordered by paper count. */
export const useTags = (): Tag[] => useAppStore((s) => s.tags);

/** Returns all projects. */
export const useProjects = (): Project[] => useAppStore((s) => s.projects);

/** Returns all saved insights. */
export const useInsights = (): Insight[] => useAppStore((s) => s.insights);

/** Returns whether any data-loading operation is in progress. */
export const useIsLoading = (): boolean => useAppStore((s) => s.loading);

/** Returns the last error message, or null. */
export const useError = (): string | null => useAppStore((s) => s.error);

/** Returns the currently active project ID ('all' means no project filter). */
export const useActiveProjectId = (): string => useAppStore((s) => s.activeProjectId);

/** Returns the current filter state. */
export const useFilter = (): PaperFilter => useAppStore((s) => s.filter);

/** Returns the application settings. */
export const useSettings = (): AppSettings | null => useAppStore((s) => s.settings);
