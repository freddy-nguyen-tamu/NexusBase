"use client";

import { useState } from "react";
import { Activity, ChevronLeft, ChevronRight, Dot } from "lucide-react";

type TimelineActivity = {
  actor: string;
  action: string;
  subject: string;
  scope: string;
  time: string;
};

const PER_PAGE = 3;

export function ActivityTimeline({
  activity = [],
}: {
  activity?: TimelineActivity[];
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(activity.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PER_PAGE;
  const visible = activity.slice(start, start + PER_PAGE);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-[#d97706]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Activity Log</h2>
          <p className="text-sm text-slate-500">Audit-ready workspace history.</p>
        </div>
      </div>

      <div className="space-y-4 min-h-[200px]">
        {visible.map((event) => (
          <div key={`${event.actor}-${event.subject}`} className="flex gap-3">
            <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Dot className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-5 text-slate-700">
                <span className="font-semibold text-slate-950">{event.actor}</span> {event.action}{" "}
                <span className="font-semibold text-slate-950">{event.subject}</span>
              </p>
              <p className="text-xs text-slate-500">{event.scope} · {event.time}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1 border-t border-slate-100 pt-3">
          <button
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`grid h-8 w-8 place-items-center rounded-md text-sm font-medium transition-colors ${
                i === safePage
                  ? "bg-amber-100 text-amber-800"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              onClick={() => setPage(i)}
              type="button"
            >
              {i + 1}
            </button>
          ))}
          <button
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
            disabled={safePage === totalPages - 1}
            onClick={() => setPage(safePage + 1)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
