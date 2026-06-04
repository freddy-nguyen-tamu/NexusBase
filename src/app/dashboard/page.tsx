import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell"
import StatsCards from "@/components/dashboard/StatsCards"
import { ProjectManager } from "@/components/dashboard/project-manager"
import { TaskBoard } from "@/components/dashboard/task-board"
import { RoadmapPanel } from "@/components/dashboard/roadmap-panel"
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
        <Link
          href="/dashboard/health"
          className="block rounded-2xl border border-nb-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
              Project Health
            </h2>
            <ShieldAlert className="h-5 w-5 text-nb-muted" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm text-nb-muted">
            Track risks, blockers, severity, owners, and mitigation plans across workspaces.
          </p>
        </Link>
      </section>

      <section className="mt-6">
        <div className="sl-card">
          <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
            Roadmap & Decisions
          </h2>
          <div className="mt-4">
            <RoadmapPanel />
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
