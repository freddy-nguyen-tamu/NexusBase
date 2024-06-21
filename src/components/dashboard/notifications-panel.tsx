import { Bell } from "lucide-react";

import { notifications } from "@/lib/sample-data";

export function NotificationsPanel() {
  return (
    <section id="notifications" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#be123c]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
            <p className="text-sm text-slate-500">Assignment, comment, and file-share events.</p>
          </div>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          {notifications.filter((item) => item.unread).length} unread
        </span>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.title}
            className={
              notification.unread
                ? "rounded-lg border border-rose-100 bg-rose-50 p-3"
                : "rounded-lg border border-slate-100 bg-slate-50 p-3"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
              <p className="shrink-0 text-xs text-slate-500">{notification.time}</p>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">{notification.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
