import { ArrowDownRight, ArrowUpRight, BarChart3, Cloud, ListTodo, MessageCircle } from "lucide-react";

import { workspaceStats } from "@/lib/sample-data";

const icons = [BarChart3, ListTodo, Cloud, MessageCircle];
const accents = ["#2563eb", "#0f766e", "#d97706", "#be123c"];

export function MetricCards() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {workspaceStats.map((stat, index) => {
        const Icon = icons[index];
        const isPositive = stat.trend.startsWith("+");

        return (
          <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100" style={{ color: accents[index] }}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span
                className={
                  isPositive
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    : "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                }
              >
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </span>
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">{stat.value}</p>
            <p className="mt-2 text-sm text-slate-500">{stat.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
