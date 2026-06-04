"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, Users, HardDrive } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.ok ? r.json() : {})
      .then((d: Record<string, unknown>) => setStats((d as { stats?: Record<string, number> }).stats ?? {}))
      .catch(() => {});
  }, []);

  const cards = [
    { label: "Projects", value: stats.projects ?? "—", icon: Activity },
    { label: "Tasks", value: stats.tasks ?? "—", icon: BarChart3 },
    { label: "Members", value: stats.users ?? "—", icon: Users },
    { label: "Files", value: stats.files ?? "—", icon: HardDrive },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-nb-text">Analytics</h1>
      <p className="mt-1 text-sm text-nb-muted">Workspace-wide metrics and usage data.</p>
      <div className="mt-6 grid grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-white border border-nb-border p-5 shadow-sm">
            <Icon className="h-5 w-5 text-nb-navy mb-2" />
            <p className="text-2xl font-heading font-black text-nb-navy">{value}</p>
            <p className="text-xs text-nb-muted mt-0.5 font-mono">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
