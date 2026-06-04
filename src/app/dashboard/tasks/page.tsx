import DashboardShell from "@/components/layout/DashboardShell"
import { TaskBoard } from "@/components/dashboard/task-board"

export default function TasksPage() {
  return (
    <DashboardShell>
      <div className="sl-card min-h-[500px]">
        <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
          Task Board
        </h2>
        <div className="mt-4">
          <TaskBoard />
        </div>
      </div>
    </DashboardShell>
  )
}
