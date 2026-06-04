import DashboardShell from "@/components/layout/DashboardShell"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"

export default function NotificationsPage() {
  return (
    <DashboardShell>
      <div className="sl-card">
        <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
          Notifications
        </h2>
        <div className="mt-4">
          <NotificationsPanel />
        </div>
      </div>
    </DashboardShell>
  )
}
