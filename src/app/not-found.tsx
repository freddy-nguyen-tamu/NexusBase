import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-nb-bg px-6 py-16 text-nb-text">
      <section className="mx-auto max-w-xl rounded-2xl border border-nb-border bg-white p-8 shadow-sm">
        <div className="mb-5 inline-flex rounded-xl bg-nb-surface-alt p-3 text-nb-navy">
          <LayoutDashboard className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nb-muted">
          404
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-nb-text">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-6 text-nb-muted">
          This NexusBase route does not exist or may have moved. Return to the
          dashboard to continue working with projects, tasks, files, and
          messages.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-nb-border bg-white px-4 py-2.5 text-sm font-semibold text-nb-navy shadow-sm transition hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-md focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to dashboard
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-nb-muted transition hover:bg-nb-surface-alt hover:text-nb-text"
          >
            Go to landing page
          </Link>
        </div>
      </section>
    </main>
  );
}
