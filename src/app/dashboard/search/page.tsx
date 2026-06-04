"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  Loader2,
  FileText,
  CheckCircle2,
  MessageCircle,
  FolderKanban,
  MessageSquareText,
  Activity,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SearchResultType = "project" | "task" | "file" | "comment" | "message";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  body: string | null;
  projectId: string;
  projectName: string;
  href: string;
  updatedAt: Date;
  meta: Record<string, string | number | null>;
};

const typeFilters: Array<{
  value: SearchResultType | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "file", label: "Files" },
  { value: "comment", label: "Comments" },
  { value: "message", label: "Messages" },
];

function getTypeIcon(type: SearchResultType) {
  switch (type) {
    case "project":
      return FolderKanban;
    case "task":
      return CheckCircle2;
    case "file":
      return FileText;
    case "comment":
      return MessageSquareText;
    case "message":
      return MessageCircle;
  }
}

function getTypeBadgeStyle(type: SearchResultType) {
  switch (type) {
    case "project":
      return "bg-indigo-50 text-indigo-700 ring-indigo-100";
    case "task":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "file":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "comment":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "message":
      return "bg-rose-50 text-rose-700 ring-rose-100";
  }
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBodySnippet(body: string | null) {
  if (!body) return null;
  return body.length > 200 ? body.slice(0, 200) + "..." : body;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchResultType | "all">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "Search failed.");
      }
      const data = await res.json() as { results: SearchResult[] };
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-nb-navy" />
        <h1 className="text-lg font-semibold text-nb-text">Search</h1>
      </div>
      <p className="mt-1 text-sm text-nb-muted">
        Search projects, tasks, files, comments, and messages across the
        workspace.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="h-10 flex-1 rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition placeholder:text-nb-muted focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search projects, tasks, files, comments, messages..."
        />
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-nb-border bg-white px-4 text-sm font-semibold text-nb-text transition hover:bg-nb-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || !query.trim()}
          onClick={search}
          type="button"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              type === f.value
                ? "bg-nb-green text-white"
                : "bg-nb-surface-alt text-nb-muted hover:bg-nb-border",
            )}
            onClick={() => setType(f.value)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-nb-orange/30 bg-orange-50 px-3 py-2 text-sm text-nb-orange">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-nb-border">
        {loading ? (
          <div className="p-8 text-center text-sm text-nb-muted">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Searching...
          </div>
        ) : null}

        {!loading && !searched ? (
          <div className="p-8 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-nb-gray-400" />
            <h3 className="text-sm font-semibold text-nb-text">
              Enter a search query
            </h3>
            <p className="mt-1 text-sm text-nb-muted">
              Type above and press Enter or click Search to find results.
            </p>
          </div>
        ) : null}

        {!loading && searched && results.length === 0 && !error ? (
          <div className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-nb-gray-400" />
            <h3 className="text-sm font-semibold text-nb-text">
              No results found
            </h3>
            <p className="mt-1 text-sm text-nb-muted">
              Try a different search term or type filter.
            </p>
          </div>
        ) : null}

        {!loading && results.length > 0 ? (
          <div className="divide-y divide-nb-border">
            {results.map((r) => {
              const Icon = getTypeIcon(r.type);
              const snippet = getBodySnippet(r.body);
              return (
                <Link
                  key={r.id}
                  href={r.href}
                  className="block p-4 transition hover:bg-nb-surface-alt"
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
                        getTypeBadgeStyle(r.type),
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-nb-text">
                            {r.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-nb-muted">
                            in{" "}
                            <span className="font-semibold text-nb-text">
                              {r.projectName}
                            </span>
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-nb-muted">
                          {formatDateTime(r.updatedAt)}
                        </span>
                      </div>

                      {snippet ? (
                        <p className="mt-2 text-sm text-nb-muted line-clamp-2">
                          {snippet}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                            getTypeBadgeStyle(r.type),
                          )}
                        >
                          {r.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
