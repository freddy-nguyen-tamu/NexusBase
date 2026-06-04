import DashboardShell from "@/components/layout/DashboardShell";
import { ProjectHealthCenter } from "@/components/dashboard/project-health-center";

export const dynamic = "force-dynamic";

export default function ProjectHealthPage() {
  return (
    <DashboardShell>
      <ProjectHealthCenter />
    </DashboardShell>
  );
}
