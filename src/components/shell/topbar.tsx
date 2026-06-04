import { Bell, LogIn, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 bg-white border-b border-nb-border">
      <div>
        <p className="text-sm font-medium text-nb-navy-mid">Full-stack collaborative workspace</p>
        <h1 className="mt-0.5 text-2xl font-semibold text-nb-text">NexusBase Command Center</h1>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative block min-w-0 sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nb-muted" />
          <span className="sr-only">Search workspace</span>
          <input
            className="h-10 w-full rounded-lg border border-nb-border bg-nb-surface-alt pl-9 pr-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:bg-white focus:ring-2 focus:ring-nb-green/20"
            placeholder="Search tasks, files, comments..."
            type="search"
          />
        </label>

        <div className="flex items-center gap-2">
          <a
            className="grid h-10 w-10 place-items-center rounded-lg border border-nb-border text-nb-muted hover:border-nb-green hover:text-nb-green"
            href="#notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            className="grid h-10 w-10 place-items-center rounded-lg border border-nb-border text-nb-muted hover:border-nb-green hover:text-nb-green"
            href="/admin"
            title="Admin panel"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-nb-navy px-4 text-sm font-semibold text-white hover:bg-nb-navy-mid"
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
