import { ShieldCheck } from "lucide-react";

type AdminMetric = {
  label: string;
  value: string;
  detail: string;
};

export function AdminSnapshot({ metrics = [] }: { metrics?: AdminMetric[] }) {
  return (
    <section className="rounded-xl border border-nb-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-nb-navy" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-nb-text">Admin Snapshot</h2>
          <p className="text-sm text-nb-muted">User management and system analytics.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-nb-navy-border bg-nb-navy/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-nb-muted">{metric.label}</p>
            <p className="mt-1 text-2xl font-heading font-black text-nb-navy">{metric.value}</p>
            <p className="mt-1 text-xs text-nb-muted">{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
