import { NavLink } from "react-router-dom";
import {
  BookOpen, LayoutDashboard, BarChart3, Brain, Bookmark,
  HardDrive, Settings, FlaskConical
} from "lucide-react";

const navItems = [
  { to: "/library", icon: BookOpen, label: "Library" },
  { to: "/topics", icon: LayoutDashboard, label: "Topics" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/ai-insights", icon: Brain, label: "AI Insights" },
  { to: "/saved-insights", icon: Bookmark, label: "Saved Insights" },
];

const bottomItems = [
  { to: "/backup", icon: HardDrive, label: "Backup" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-gray-200">
        <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center">
          <FlaskConical className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-800 text-sm tracking-tight">ResearchLab</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-2">
          Workspace
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-gray-100 pt-3">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
