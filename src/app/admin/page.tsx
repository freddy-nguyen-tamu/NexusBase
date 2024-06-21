import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AdminSnapshot } from "@/components/dashboard/admin-snapshot";
import { MembersPanel } from "@/components/dashboard/members-panel";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <div className="mx-auto flex max-w-[1680px]">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="space-y-5 p-4 sm:p-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#0f766e]">Admin dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">Users, Roles, and Audit Controls</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                This page is structured for protected admin-only actions: user role changes, system metrics, storage oversight, and audit review.
              </p>
            </div>
            <AdminSnapshot />
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ActivityTimeline />
              </div>
              <div className="space-y-5">
                <MembersPanel />
                <NotificationsPanel />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
