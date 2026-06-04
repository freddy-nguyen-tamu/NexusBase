"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => !prev);
  }

  return (
    <div className="flex min-h-screen relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <main
        className={`flex-1 overflow-y-auto p-6 md:p-8 transition-all duration-300`}
      >
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>

      <button
        onClick={toggleSidebar}
        className="fixed top-4 z-50 grid h-7 w-7 place-items-center rounded-full border border-nb-border bg-nb-surface text-nb-navy shadow-sm hover:bg-nb-surface-alt transition-colors"
        style={{ left: sidebarCollapsed ? "0.75rem" : "18rem" }}
        title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        type="button"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
