import Sidebar from "./Sidebar"

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
