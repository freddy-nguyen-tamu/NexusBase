"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Flag,
  FolderKanban,
  Gavel,
  Loader2,
  MessageSquare,
  Search,
  Target,
} from "lucide-react";

type SearchResultType = "project" | "task" | "file" | "milestone" | "decision" | "message";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  projectId?: string;
  projectName?: string;
  updatedAt?: string;
  createdAt?: string;
};

type SearchResponse = {
  query: string;
  results: SearchResult[];
};

const typeIcon = {
  project: FolderKanban,
  task: Target,
  file: FileText,
  milestone: Flag,
  decision: Gavel,
  message: MessageSquare,
} satisfies Record<SearchResultType, typeof Search>;

function typeLabel(type: SearchResultType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function WorkspaceSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = query.trim();

  const groupedResults = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((groups, result) => {
      const label = typeLabel(result.type);
      groups[label] = groups[label] ?? [];
      groups[label].push(result);
      return groups;
    }, {});
  }, [results]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (trimmedQuery.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({ q: trimmedQuery, limit: "12" });
        const response = await fetch(`/api/search?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Search failed");
        }

        const data = (await response.json()) as SearchResponse;
        setResults(data.results);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-nb-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nb-muted">
              Universal Search
            </p>
            <h1 className="mt-2 font-heading text-2xl font-black tracking-tight text-nb-text">
              Search across NexusBase
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-nb-muted">
              Find projects, tasks, files, milestones, decisions, and team chat messages
              from every workspace you can access.
            </p>
          </div>

          <div className="rounded-xl border border-nb-border bg-nb-surface-alt px-3 py-2 text-xs font-semibold text-nb-muted">
            Tip: press Ctrl + K anywhere in the dashboard
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-nb-border bg-white px-4 py-3 shadow-sm focus-within:border-nb-navy/40 focus-within:ring-2 focus-within:ring-nb-navy/10">
          <Search className="h-5 w-5 text-nb-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by project, task, file, milestone, decision, or message..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-nb-text outline-none placeholder:text-nb-muted"
          />
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-nb-muted" aria-hidden="true" /> : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {trimmedQuery.length < 2 ? (
        <section className="rounded-2xl border border-dashed border-nb-border bg-white p-10 text-center shadow-sm">
          <Search className="mx-auto h-8 w-8 text-nb-muted" aria-hidden="true" />
          <h2 className="mt-4 text-base font-bold text-nb-text">Start typing to search your workspace data</h2>
          <p className="mt-2 text-sm text-nb-muted">
            Use at least two characters. Results will appear grouped by type.
          </p>
        </section>
      ) : null}

      {trimmedQuery.length >= 2 && !loading && results.length === 0 && !error ? (
        <section className="rounded-2xl border border-dashed border-nb-border bg-white p-10 text-center shadow-sm">
          <h2 className="text-base font-bold text-nb-text">No results found</h2>
          <p className="mt-2 text-sm text-nb-muted">
            Try a different keyword, project name, task title, file name, or chat phrase.
          </p>
        </section>
      ) : null}

      {Object.entries(groupedResults).map(([groupName, groupResults]) => (
        <section key={groupName} className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-tight text-nb-text">
              {groupName}
            </h2>
            <span className="rounded-full border border-nb-border bg-nb-surface-alt px-2.5 py-1 text-xs font-bold text-nb-muted">
              {groupResults.length}
            </span>
          </div>

          <div className="grid gap-3">
            {groupResults.map((result) => {
              const Icon = typeIcon[result.type];
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="group flex items-start gap-4 rounded-xl border border-nb-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-md focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nb-border bg-nb-surface-alt text-nb-navy transition group-hover:bg-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-nb-text">{result.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-nb-muted">
                      {result.subtitle || result.projectName || result.type}
                    </span>
                  </span>

                  <span className="rounded-full border border-nb-border bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-nb-muted">
                    {result.badge}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
