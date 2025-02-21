"use client";

import {
  AlertCircle,
  FileText,
  FolderKanban,
  Loader2,
  MessageCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquareCheckBig,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";

type SearchType =
  | "all"
  | "projects"
  | "tasks"
  | "files"
  | "comments"
  | "messages";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type SearchResult = {
  id: string;
  type: "project" | "task" | "file" | "comment" | "message";
  title: string;
  body: string | null;
  projectId: string;
  projectName: string;
  href: string;
  updatedAt: string;
  meta: Record<string, string | number | null>;
};

const searchTypes: Array<{
  value: SearchType;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "projects", label: "Projects" },
  { value: "tasks", label: "Tasks" },
  { value: "files", label: "Files" },
  { value: "comments", label: "Comments" },
  { value: "messages", label: "Messages" },
];

const resultIcons = {
  project: FolderKanban,
  task: SquareCheckBig,
  file: FileText,
  comment: MessageSquareText,
  message: MessageCircle,
};

const resultStyles = {
  project: "bg-violet-50 text-violet-700 ring-violet-100",
  task: "bg-blue-50 text-blue-700 ring-blue-100",
  file: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  comment: "bg-amber-50 text-amber-700 ring-amber-100",
  message: "bg-rose-50 text-rose-700 ring-rose-100",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatType(value: SearchResult["type"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMetaValue(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return value;
}

function getResultSummary(result: SearchResult) {
  const pairs = Object.entries(result.meta)
    .map(([key, value]) => {
      const formattedValue = formatMetaValue(value);

      if (!formattedValue) {
        return null;
      }

      return `${key}: ${formattedValue}`;
    })
    .filter(Boolean);

  return pairs.slice(0, 3).join(" / ");
}

export function GlobalSearch() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [projectId, setProjectId] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedResults = useMemo(() => {
    return results.reduce(
      (groups, result) => {
        groups[result.type].push(result);
        return groups;
      },
      {
        project: [],
        task: [],
        file: [],
        comment: [],
        message: [],
      } as Record<SearchResult["type"], SearchResult[]>,
    );
  }, [results]);

  const totalGroups = Object.values(groupedResults).filter(
    (items) => items.length > 0,
  ).length;

  async function loadProjects() {
    setIsLoadingProjects(true);

    try {
      const response = await fetch("/api/projects", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        setProjects([]);
        return;
      }

      const data = (await response.json()) as { projects: Project[] };
      setProjects(data.projects);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Enter a search query.");
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        type,
      });

      if (projectId) {
        params.set("projectId", projectId);
      }

      const response = await fetch(`/api/search?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Search failed.");
      }

      const data = (await response.json()) as {
        query: string;
        count: number;
        results: SearchResult[];
      };

      setResults(data.results);
      setLastQuery(data.query);
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Search failed.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setLastQuery("");
    setResults([]);
    setError(null);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[#2563eb]" />
            <h2 className="text-lg font-semibold text-slate-950">
              Global search
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Search projects, tasks, files, comments, and team chat from one
            place.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSearching || !lastQuery}
          onClick={() => void runSearch()}
          type="button"
        >
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Rerun
        </button>
      </div>

      <form
        className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_170px_220px_auto]"
        onSubmit={runSearch}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search query
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search design spec, launch task, invoice.pdf..."
              value={query}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Type
          </span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            onChange={(event) => setType(event.target.value as SearchType)}
            value={type}
          >
            {searchTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project filter
          </span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={isLoadingProjects}
            onChange={(event) => setProjectId(event.target.value)}
            value={projectId}
          >
            <option value="">All accessible projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSearching || !query.trim()}
            type="submit"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Search
          </button>

          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-white"
            onClick={clearSearch}
            type="button"
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {results.length} results
        </span>

        {lastQuery ? (
          <span>
            Matching{" "}
            <span className="font-semibold text-slate-800">"{lastQuery}"</span>
            {totalGroups ? ` across ${totalGroups} result groups` : ""}
          </span>
        ) : (
          <span>Run a search to inspect workspace content.</span>
        )}
      </div>

      <div className="space-y-4">
        {!isSearching && lastQuery && results.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">
              No results found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try a different keyword, type, or project filter.
            </p>
          </div>
        ) : null}

        {(
          [
            ["project", groupedResults.project],
            ["task", groupedResults.task],
            ["file", groupedResults.file],
            ["comment", groupedResults.comment],
            ["message", groupedResults.message],
          ] as Array<[SearchResult["type"], SearchResult[]]>
        ).map(([groupType, groupResults]) => {
          if (!groupResults.length) {
            return null;
          }

          return (
            <div
              className="rounded-lg border border-slate-200 bg-white"
              key={groupType}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  {formatType(groupType)} results
                </h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                  {groupResults.length}
                </span>
              </div>

              <div className="divide-y divide-slate-200">
                {groupResults.map((result) => {
                  const Icon = resultIcons[result.type];
                  const metaSummary = getResultSummary(result);

                  return (
                    <article className="p-4" key={`${result.type}-${result.id}`}>
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1",
                            resultStyles[result.type],
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {result.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatType(result.type)} /{" "}
                                {result.projectName} /{" "}
                                {formatDate(result.updatedAt)}
                              </p>
                            </div>

                            <span
                              className={cn(
                                "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                                resultStyles[result.type],
                              )}
                            >
                              {formatType(result.type)}
                            </span>
                          </div>

                          {result.body ? (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {result.body}
                            </p>
                          ) : null}

                          {metaSummary ? (
                            <p className="mt-3 text-xs font-medium text-slate-400">
                              {metaSummary}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
