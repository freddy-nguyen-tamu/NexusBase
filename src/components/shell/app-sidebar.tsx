import {
  Bell,
  Files,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  SquareKanban,
  Users,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Projects", icon: SquareKanban },
  { label: "Files", icon: Files },
  { label: "Messages", icon: MessageSquare },
  { label: "Search", icon: Search },
  { label: "Notifications", icon: Bell },
  { label: "Members", icon: Users },
  { label: "Permissions", icon: LockKeyhole },
  { label: "Admin", icon: ShieldCheck },
  { label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-[#10151f] p-5 text-white lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#2dd4bf] text-base font-black text-[#10151f]">
          NB
        </div>
        <div>
          <p className="text-lg font-semibold">NexusBase</p>
          <p className="text-xs text-slate-300">Team Workspace</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            className={
              item.active
                ? "flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-[#10151f]"
                : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
            }
            href={item.label === "Admin" ? "/admin" : "#"}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.06] p-4">
        <p className="text-sm font-semibold">Production stack</p>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          Next.js, TypeScript, Google OAuth, Prisma Postgres, AWS S3, RBAC, audit logs, and real-time-ready messages.
        </p>
      </div>
    </aside>
  );
}
