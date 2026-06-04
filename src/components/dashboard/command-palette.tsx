"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Flag,
  FolderKanban,
  Gavel,
  Loader2,
  MessageSquare,
  Search,
  Target,
  X,
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

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  const groupedResults = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((groups, result) => {
      const key = typeLabel(result.type);
      groups[key] = groups[key] ?? [];
      groups[key].push(result);
      return groups;
    }, {});
  }, [results]);

  function closePalette() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
    setActiveIndex(0);
  }

  function openPalette() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function goToResult(result: SearchResult) {
    closePalette();
    router.push(result.href);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (!open && !isTypingTarget && event.key === "/") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (open && event.key === "Escape") {
        event.preventDefault();
        closePalette();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (trimmedQuery.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ q: trimmedQuery, limit: "6" });
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
        setActiveIndex(0);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, trimmedQuery]);

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (results.length === 0 ? 0 : Math.min(index + 1, results.length - 1)));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      goToResult(results[activeIndex]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="fixed bottom-20 right-6 z-[100] inline-flex items-center gap-2 rounded-xl border border-nb-border bg-white/95 px-3.5 py-2.5 text-sm font-semibold text-nb-navy shadow-lg shadow-slate-950/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
        aria-label="Open workspace search"
        title="Search NexusBase"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded-md border border-nb-border bg-nb-surface-alt px-1.5 py-0.5 text-[10px] font-bold text-nb-muted sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] bg-nb-dark/30 px-4 py-16 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace search"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePalette();
          }}
        >
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-nb-border bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-center gap-3 border-b border-nb-border px-4 py-3">
              <Search className="h-5 w-5 text-nb-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search projects, tasks, files, milestones, decisions, and messages..."
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-nb-text outline-none placeholder:text-nb-muted"
              />
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-nb-muted" /> : null}
              <button
                type="button"
                onClick={closePalette}
                className="rounded-lg border border-nb-border bg-white p-2 text-nb-muted transition hover:bg-nb-surface-alt hover:text-nb-text focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
                aria-label="Close search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3">
              {trimmedQuery.length < 2 ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-nb-surface-alt px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-nb-text">
                    Search everything in your accessible workspaces.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-nb-muted">
                    Type at least two characters. Use the arrow keys to move and Enter to open a result.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {trimmedQuery.length >= 2 && !loading && results.length === 0 && !error ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-nb-surface-alt px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-nb-text">No matching results.</p>
                  <p className="mt-2 text-xs text-nb-muted">
                    Try a project name, task title, file name, milestone, decision, or chat keyword.
                  </p>
                </div>
              ) : null}

              {Object.entries(groupedResults).map(([groupName, groupResults]) => (
                <section key={groupName} className="mb-4 last:mb-0">
                  <h3 className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.18em] text-nb-muted">
                    {groupName}
                  </h3>

                  <div className="space-y-1">
                    {groupResults.map((result) => {
                      const globalIndex = results.findIndex((item) => item.id === result.id);
                      const active = globalIndex === activeIndex;
                      const Icon = typeIcon[result.type];

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => goToResult(result)}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          className={[
                            "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                            active
                              ? "border-nb-navy/30 bg-nb-surface-alt shadow-sm"
                              : "border-transparent hover:border-nb-border hover:bg-nb-surface-alt",
                          ].join(" ")}
                        >
                          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-nb-border bg-white text-nb-navy">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-nb-text">
                              {result.title}
                            </span>
                            <span className="mt-1 block truncate text-xs text-nb-muted">
                              {result.subtitle || result.projectName || result.type}
                            </span>
                          </span>

                          <span className="rounded-full border border-nb-border bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-nb-muted">
                            {result.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-nb-border bg-nb-surface-alt px-4 py-2 text-[11px] text-nb-muted">
              <span>Esc closes</span>
              <span>↑↓ move · Enter opens</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
