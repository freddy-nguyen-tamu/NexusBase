"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderKanban,
  Loader2,
  MessageCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ActivityType =
  | "all"
  | "project"
  | "task"
  | "file"
  | "comment"
  | "message"
  | "member"
  | "admin";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type ActivityLog = {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
  projectId: string | null;
  taskId: string | null;
  fileId: string | null;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    slug: string;
  } | null;
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  file: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
  } | null;
};

const activityTypes: Array<{
  value: ActivityType;
  label: string;
}> = [
  { value: "all", label: "All activity" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "file", label: "Files" },
  { value: "comment", label: "Comments" },
  { value: "message", label: "Messages" },
  { value: "member", label: "Members" },
  { value: "admin", label: "Admin" },
];

function getActorName(item: ActivityLog) {
  return item.actor?.name ?? item.actor?.email ?? "System";
}

function getActorInitials(item: ActivityLog) {
  return getActorName(item)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}

function getActivitySignal(item: ActivityLog) {
  return `${item.action} ${item.summary}`.toUpperCase();
}

function isAdminActivity(item: ActivityLog) {
  const signal = getActivitySignal(item);

  return (
    signal.includes("ADMIN") ||
    item.summary.startsWith("Updated user") ||
    item.summary.startsWith("Deleted user")
  );
}

function getActivityIcon(item: ActivityLog) {
  const signal = getActivitySignal(item);

  if (isAdminActivity(item)) {
    return ShieldCheck;
  }

  if (signal.includes("MESSAGE") || signal.includes("CHAT")) {
    return MessageCircle;
  }

  if (signal.includes("COMMENT") || item.action === "COMMENTED") {
    return MessageSquareText;
  }

  if (signal.includes("FILE") || item.action === "UPLOADED" || item.fileId) {
    return FileText;
  }

  if (
    signal.includes("MEMBER") ||
    signal.includes("INVITE") ||
    signal.includes("REMOVED")
  ) {
    return UserPlus;
  }

  if (signal.includes("TASK") || item.action === "ASSIGNED" || item.taskId) {
    return CheckCircle2;
  }

  if (signal.includes("PROJECT") || item.projectId) {
    return FolderKanban;
  }

  return Activity;
}

function getActivityStyle(item: ActivityLog) {
  const signal = getActivitySignal(item);

  if (isAdminActivity(item)) {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }

  if (signal.includes("MESSAGE") || signal.includes("CHAT")) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (signal.includes("COMMENT") || item.action === "COMMENTED") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (signal.includes("FILE") || item.action === "UPLOADED" || item.fileId) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (
    signal.includes("MEMBER") ||
    signal.includes("INVITE") ||
    signal.includes("REMOVED")
  ) {
    return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  }

  if (signal.includes("TASK") || item.action === "ASSIGNED" || item.taskId) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (signal.includes("PROJECT") || item.projectId) {
    return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getContextParts(item: ActivityLog) {
  return [
    item.project ? `Project: ${item.project.name}` : null,
    item.task ? `Task: ${item.task.title}` : null,
    item.file ? `File: ${item.file.name}` : null,
  ].filter(Boolean);
}

export function ActivityFeed() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<ActivityType>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("50");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredActivity = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return activity;
    }

    return activity.filter((item) => {
      const searchable = [
        item.action,
        item.summary,
        getActorName(item),
        item.project?.name,
        item.project?.slug,
        item.task?.title,
        item.file?.name,
        item.file?.mimeType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(trimmedQuery);
    });
  }, [activity, query]);

  const stats = useMemo(() => {
    return {
      total: activity.length,
      visible: filteredActivity.length,
      projectEvents: activity.filter((item) => item.projectId).length,
      taskEvents: activity.filter((item) => item.taskId).length,
      fileEvents: activity.filter((item) => item.fileId).length,
    };
  }, [activity, filteredActivity.length]);

  async function loadActivity() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type,
        limit,
      });

      if (projectId) {
        params.set("projectId", projectId);
      }

      const response = await fetch(`/api/activity?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setActivity([]);
        setProjects([]);
        setError("Sign in to load activity.");
        return;
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not load activity.");
      }

      const data = (await response.json()) as {
        activity: ActivityLog[];
        projects: Project[];
      };

      setActivity(data.activity);
      setProjects(data.projects);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load activity.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, [projectId, type, limit]);

  return (
    <section className="rounded-xl border border-nb-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-nb-navy" />
            <h2 className="text-lg font-semibold text-nb-text">
              Activity timeline
            </h2>
          </div>
          <p className="mt-1 text-sm text-nb-muted">
            Track project changes, task movement, file events, comments,
            messages, member updates, and admin actions.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-nb-border px-3 text-xs font-semibold text-nb-muted hover:border-nb-navy-border hover:bg-nb-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void loadActivity()}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-nb-border bg-nb-surface-alt p-3 lg:grid-cols-[1fr_180px_220px_120px]">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-nb-muted">
            Search activity
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nb-muted" />
            <input
              className="h-10 w-full rounded-lg border border-nb-border bg-white pl-9 pr-3 text-sm text-nb-text outline-none transition placeholder:text-nb-muted focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actor, task, file, action..."
              value={query}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-nb-muted">
            Type
          </span>
          <select
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            onChange={(event) => setType(event.target.value as ActivityType)}
            value={type}
          >
            {activityTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-nb-muted">
            Project
          </span>
          <select
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
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

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-nb-muted">
            Limit
          </span>
          <select
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            onChange={(event) => setLimit(event.target.value)}
            value={limit}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-nb-orange/30 bg-orange-50 px-3 py-2 text-sm text-nb-orange">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Loaded" value={stats.total} />
        <StatCard label="Visible" value={stats.visible} />
        <StatCard label="Project events" value={stats.projectEvents} />
        <StatCard label="Task events" value={stats.taskEvents} />
        <StatCard label="File events" value={stats.fileEvents} />
      </div>

      <div className="rounded-lg border border-nb-border">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-nb-muted">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Loading activity...
          </div>
        ) : null}

        {!isLoading && filteredActivity.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-nb-gray-400" />
            <h3 className="text-sm font-semibold text-nb-text">
              No activity found
            </h3>
            <p className="mt-1 text-sm text-nb-muted">
              Try changing the filter, project, or search text.
            </p>
          </div>
        ) : null}

        {!isLoading && filteredActivity.length > 0 ? (
          <div className="divide-y divide-nb-border">
            {filteredActivity.map((item) => {
              const Icon = getActivityIcon(item);
              const contextParts = getContextParts(item);

              return (
                <article className="p-4" key={item.id}>
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
                        getActivityStyle(item),
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-nb-text">
                            {item.summary}
                          </h3>
                          <p className="mt-1 text-xs text-nb-muted">
                            {item.action} by{" "}
                            <span className="font-semibold text-nb-text">
                              {getActorName(item)}
                            </span>
                          </p>
                        </div>

                        <span className="shrink-0 text-xs text-nb-muted">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-nb-surface-alt px-2.5 py-1 text-xs font-semibold text-nb-muted">
                          Actor: {getActorInitials(item)}
                        </span>

                        {contextParts.map((part) => (
                          <span
                            className="rounded-full bg-nb-surface-alt px-2.5 py-1 text-xs font-semibold text-nb-muted"
                            key={part}
                          >
                            {part}
                          </span>
                        ))}

                        {item.task ? (
                          <>
                            <span className="rounded-full bg-nb-navy/10 px-2.5 py-1 text-xs font-semibold text-nb-navy">
                              {item.task.status}
                            </span>
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              {item.task.priority}
                            </span>
                          </>
                        ) : null}

                        {item.file ? (
                          <span className="rounded-full bg-nb-green-pale px-2.5 py-1 text-xs font-semibold text-nb-green-dark">
                            {item.file.mimeType} - {formatBytes(item.file.size)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-nb-border bg-white px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-widest text-nb-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-nb-text">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
