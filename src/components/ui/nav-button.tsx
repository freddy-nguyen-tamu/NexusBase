"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = new Set(["/", "/login"]);

function shouldHideDashboardButton(pathname: string) {
  if (HIDDEN_PATHS.has(pathname)) return true;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }

  return false;
}

export function NavButton() {
  const pathname = usePathname();

  if (shouldHideDashboardButton(pathname)) {
    return null;
  }

  const isDashboard = pathname === "/dashboard";

  return (
    <Link
      href="/dashboard"
      aria-label={isDashboard ? "Dashboard home" : "Return to dashboard"}
      title={isDashboard ? "Dashboard home" : "Return to dashboard"}
      className="fixed bottom-6 right-6 z-[100] inline-flex items-center gap-2 rounded-xl border border-nb-border bg-white/95 px-3.5 py-2.5 text-sm font-semibold text-nb-navy shadow-lg shadow-slate-950/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
    >
      {isDashboard ? (
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">
        {isDashboard ? "Dashboard" : "Dashboard"}
      </span>
    </Link>
  );
}
