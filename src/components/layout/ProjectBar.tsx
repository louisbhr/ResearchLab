import { Plus } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useState } from "react";
import CreateProjectDialog from "../settings/CreateProjectDialog";

export default function ProjectBar() {
  const { projects, activeProjectId, setActiveProject } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="h-12 bg-white border-b border-gray-200 flex items-center gap-1 px-4 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveProject("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            activeProjectId === "all"
              ? "bg-cyan-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          All Papers
        </button>

        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveProject(p.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeProjectId === p.id
                ? "bg-cyan-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p.name}
          </button>
        ))}

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors whitespace-nowrap ml-1"
        >
          <Plus className="w-3 h-3" />
          New Project
        </button>
      </div>

      {showCreate && <CreateProjectDialog onClose={() => setShowCreate(false)} />}
    </>
  );
}
