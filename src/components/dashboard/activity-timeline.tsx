import { Activity, Dot } from "lucide-react";

type TimelineActivity = {
  actor: string;
  action: string;
  subject: string;
  scope: string;
  time: string;
};

export function ActivityTimeline({
  activity = [],
}: {
  activity?: TimelineActivity[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-[#d97706]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Activity Log</h2>
          <p className="text-sm text-slate-500">Audit-ready workspace history.</p>
        </div>
      </div>

      <div className="space-y-4">
        {activity.map((event) => (
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
    </section>
  );
}
