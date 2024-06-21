import { Bell, LogIn, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Topbar() {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-sm font-medium text-[#0f766e]">Full-stack collaborative workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">NexusBase Command Center</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search workspace</span>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
            placeholder="Search tasks, files, comments..."
            type="search"
          />
        </label>

        <div className="flex items-center gap-2">
          <a
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-[#2563eb] hover:text-[#2563eb]"
            href="#notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-[#0f766e] hover:text-[#0f766e]"
            href="/admin"
            title="Admin panel"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937]"
            href="/login"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
