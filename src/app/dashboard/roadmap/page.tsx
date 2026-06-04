import DashboardShell from "@/components/layout/DashboardShell";
import { RoadmapPanel } from "@/components/dashboard/roadmap-panel";

export const dynamic = "force-dynamic";

export default function RoadmapPage() {
  return (
    <DashboardShell>
      <div className="sl-card">
        <h1 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
          Roadmap & Decisions
        </h1>
        <div className="mt-4">
          <RoadmapPanel />
        </div>
      </div>
    </DashboardShell>
  );
}
