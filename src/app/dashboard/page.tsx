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

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="sl-card col-span-4">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
            Projects
          </h2>
          <div className="mt-4">
            <ProjectManager />
          </div>
        </div>

        <div className="sl-card col-span-8 min-h-[500px]">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
            Task Board
          </h2>
          <div className="mt-4">
            <TaskBoard />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="sl-card col-span-8">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
            Workspace Files
          </h2>
          <div className="mt-4">
            <FileTable />
          </div>
        </div>

        <div className="sl-card col-span-4">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
            Activity
          </h2>
          <div className="mt-4">
            <ActivityFeed />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="sl-card">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
            Team Chat
          </h2>
          <div className="mt-4">
            <TeamChat />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
