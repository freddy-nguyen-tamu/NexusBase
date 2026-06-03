"use client"

import { usePathname } from "next/navigation"

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Messages", href: "/dashboard/messages" },
  { label: "Files", href: "/dashboard/files" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Notifications", href: "/dashboard/notifications" },
  { label: "Settings", href: "/dashboard/settings" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-72 h-screen sticky top-0 border-r border-framer-border bg-white/80 backdrop-blur-xl flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-framer-border">
        <span className="font-heading font-semibold tracking-tight text-xl text-framer-text">
          NexusBase
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[#BFFB4F] text-black"
                  : "text-framer-muted hover:text-framer-text hover:bg-black/[0.04]"
              }`}
            >
              {item.label}
            </a>
          )
        })}
      </nav>
      <div className="p-3 border-t border-framer-border">
        <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-framer-muted">
          <div className="h-8 w-8 rounded-full bg-framer-surface-subtle border border-framer-border flex items-center justify-center text-xs font-semibold text-framer-text">
            A
          </div>
          <span className="font-medium">Alex</span>
        </div>
      </div>
    </aside>
  )
}
