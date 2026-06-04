"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-nb-bg px-6 py-16 text-nb-text">
      <section className="mx-auto max-w-xl rounded-2xl border border-nb-border bg-white p-8 shadow-sm">
        <div className="mb-5 inline-flex rounded-xl bg-red-50 p-3 text-red-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nb-muted">
          Error
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-nb-text">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-nb-muted">
          NexusBase hit an unexpected issue while loading this page. You can try
          again or return to the dashboard.
        </p>

        {error.digest ? (
          <p className="mt-3 rounded-lg bg-nb-surface-alt px-3 py-2 text-xs text-nb-muted">
            Error digest: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-nb-border bg-white px-4 py-2.5 text-sm font-semibold text-nb-navy shadow-sm transition hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-md focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-nb-border bg-white px-4 py-2.5 text-sm font-semibold text-nb-navy shadow-sm transition hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-md focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
