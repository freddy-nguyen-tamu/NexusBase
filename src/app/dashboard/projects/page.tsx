import DashboardShell from "@/components/layout/DashboardShell"
import { ProjectManager } from "@/components/dashboard/project-manager"

export default function ProjectsPage() {
  return (
    <DashboardShell>
      <div className="sl-card">
        <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
          Projects
        </h2>
        <div className="mt-4">
          <ProjectManager />
        </div>
      </div>
    </DashboardShell>
  )
}
