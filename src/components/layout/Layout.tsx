import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ProjectBar from "./ProjectBar";

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ProjectBar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
