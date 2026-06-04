import DashboardShell from "@/components/layout/DashboardShell"
import { FileTable } from "@/components/dashboard/file-table"

export default function FilesPage() {
  return (
    <DashboardShell>
      <div className="sl-card">
        <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
          Workspace Files
        </h2>
        <div className="mt-4">
          <FileTable />
        </div>
      </div>
    </DashboardShell>
  )
}
