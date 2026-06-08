import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Library from "./pages/Library";
import Topics from "./pages/Topics";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";
import SavedInsights from "./pages/SavedInsights";
import Backup from "./pages/Backup";
import Settings from "./pages/Settings";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const { loadProjects, loadTags, loadSettings, loadPapers } = useAppStore();

  useEffect(() => {
    // Initialize app data
    Promise.all([loadProjects(), loadTags(), loadSettings(), loadPapers()]);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/library" replace />} />
          <Route path="library" element={<Library />} />
          <Route path="topics" element={<Topics />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="ai-insights" element={<AIInsights />} />
          <Route path="saved-insights" element={<SavedInsights />} />
          <Route path="backup" element={<Backup />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
