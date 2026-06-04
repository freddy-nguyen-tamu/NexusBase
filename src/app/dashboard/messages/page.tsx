import DashboardShell from "@/components/layout/DashboardShell"
import { TeamChat } from "@/components/dashboard/team-chat"

export default function MessagesPage() {
  return (
    <DashboardShell>
      <div className="sl-card">
        <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text px-6 pt-6">
          Team Chat
        </h2>
        <div className="mt-4">
          <TeamChat />
        </div>
      </div>
    </DashboardShell>
  )
}
