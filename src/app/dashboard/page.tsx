import DashboardShell from "@/components/layout/DashboardShell"
import StatsCards from "@/components/dashboard/StatsCards"
import { ProjectManager } from "@/components/dashboard/project-manager"
import { TaskBoard } from "@/components/dashboard/task-board"
import { FileTable } from "@/components/dashboard/file-table"
import { TeamChat } from "@/components/dashboard/team-chat"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <StatsCards />

      <section className="mt-6">
        <div className="sl-card">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
            Projects
          </h2>
          <div className="mt-4">
            <ProjectManager />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="sl-card min-h-[500px]">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
            Task Board
          </h2>
          <div className="mt-4">
            <TaskBoard />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="sl-card">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
            Workspace Files
          </h2>
          <div className="mt-4">
            <FileTable />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="sl-card">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
            Activity
          </h2>
          <div className="mt-4">
            <ActivityFeed />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="sl-card">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
            Team Chat
          </h2>
          <div className="mt-4">
            <TeamChat />
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
