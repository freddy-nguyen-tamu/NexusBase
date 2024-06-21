import { ShieldCheck } from "lucide-react";

import { adminMetrics } from "@/lib/sample-data";

export function AdminSnapshot() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Admin Snapshot</h2>
          <p className="text-sm text-slate-500">User management and system analytics.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {adminMetrics.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
