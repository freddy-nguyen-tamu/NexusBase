"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Flag, LogOut } from "lucide-react";

const navItems = [
  { label: "Overview",      href: "/dashboard" },
  { label: "Search",        href: "/dashboard/search" },
  { label: "Projects",      href: "/dashboard/projects" },
  { label: "Tasks",         href: "/dashboard/tasks" },
  { label: "Roadmap",       href: "/dashboard/roadmap" },
  { label: "Messages",      href: "/dashboard/messages" },
  { label: "Files",         href: "/dashboard/files" },
  { label: "Analytics",     href: "/dashboard/analytics" },
  { label: "Notifications", href: "/dashboard/notifications" },
  { label: "Settings",      href: "/dashboard/settings" },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "User";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p.charAt(0).toUpperCase())
    .join("");

  return (
    <aside
      className={`h-screen sticky top-0 bg-nb-navy text-nb-on-dark flex flex-col shrink-0 transition-all duration-300 ${
        collapsed ? "w-0 overflow-hidden" : "w-72"
      }`}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        {!collapsed && (
          <span className="font-heading font-black text-white tracking-tight text-xl whitespace-nowrap">
            NexusBase
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="px-3 pt-4 pb-2">
            <p className="text-nb-navy-light text-xs font-bold uppercase tracking-widest px-3">
              Main Menu
            </p>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-nb-green text-nb-dark"
                      : "text-nb-navy-border hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-nb-navy-border">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-nb-surface-alt border border-nb-border flex items-center justify-center text-xs font-semibold text-nb-text">
                  {initials}
                </div>
              )}
              <span className="font-medium text-nb-on-dark truncate flex-1">
                {displayName}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-nb-navy-border hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </>
      )}

    </aside>
  );
}
