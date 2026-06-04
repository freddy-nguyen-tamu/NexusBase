"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
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

      <FloatingActionButton
        onClick={toggleSidebar}
        className="fixed top-4 z-50"
        style={{ left: sidebarCollapsed ? "0.75rem" : "18rem" }}
        title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        label={sidebarCollapsed ? "Open menu" : "Close menu"}
        icon={
          sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )
        }
      />
    </div>
  );
}
