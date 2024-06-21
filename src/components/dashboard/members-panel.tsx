import { Users } from "lucide-react";

import { members } from "@/lib/sample-data";

const statusStyles: Record<string, string> = {
  Online: "bg-emerald-500",
  Away: "bg-amber-500",
  Offline: "bg-slate-300",
};

export function MembersPanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Team Members</h2>
          <p className="text-sm text-slate-500">Roles, presence, and workload.</p>
        </div>
      </div>

      <div className="space-y-4">
        {members.map((member) => (
          <div key={member.name}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.role}</p>
                </div>
              </div>
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className={`h-2 w-2 rounded-full ${statusStyles[member.status]}`} />
                {member.status}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#2563eb]" style={{ width: `${member.workload}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
