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

      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-4">
          <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-framer-text mb-4">Projects</h2>
            <ProjectManager />
          </div>
        </div>

        <div className="col-span-8">
          <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm hover:shadow-lg transition-all duration-300 min-h-[500px]">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-framer-text mb-4">Task Board</h2>
            <TaskBoard />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-8">
          <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-framer-text mb-4">Workspace Files</h2>
            <FileTable />
          </div>
        </div>

        <div className="col-span-4">
          <div className="rounded-2xl bg-white border border-black/[0.04] p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-framer-text mb-4">Activity</h2>
            <ActivityFeed />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.04] p-6 shadow-sm hover:shadow-lg transition-all duration-300">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-framer-text mb-4">Team Chat</h2>
          <TeamChat />
        </div>
      </div>
    </DashboardShell>
  )
}
