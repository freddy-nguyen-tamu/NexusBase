"use client";

import {
  AlertCircle,
  CalendarDays,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type WorkspaceTaskStatus = "todo" | "inProgress" | "done";

type WorkspaceTask = {
  id: string;
  title: string;
  description: string;
  project: string;
  assignee: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: WorkspaceTaskStatus;
  tags: string[];
};

type Project = {
  id: string;
  name: string;
  slug: string;
};

type ApiTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type ApiTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  status: ApiTaskStatus;
  priority: ApiTaskPriority;
  dueDate: string | null;
  tags: string[];
  project: {
    id: string;
    name: string;
    slug: string;
  };
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

const columns: Array<{
  id: WorkspaceTaskStatus;
  apiStatus: ApiTaskStatus;
  label: string;
  border: string;
}> = [
  {
    id: "todo",
    apiStatus: "TODO",
    label: "Todo",
    border: "border-l-nb-green",
  },
  {
    id: "inProgress",
    apiStatus: "IN_PROGRESS",
    label: "In Progress",
    border: "border-l-nb-amber",
  },
  {
    id: "done",
    apiStatus: "DONE",
    label: "Done",
    border: "border-l-nb-navy",
  },
];

const priorityStyles: Record<WorkspaceTask["priority"], string> = {
  Low: "bg-nb-surface-alt text-nb-muted",
  Medium: "bg-nb-green-light text-nb-green-dark",
  High: "bg-nb-amber-light text-nb-amber-dark",
  Urgent: "bg-rose-50 text-rose-700",
};

const priorityToApi: Record<WorkspaceTask["priority"], ApiTaskPriority> = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
  Urgent: "URGENT",
};

const apiToPriority: Record<ApiTaskPriority, WorkspaceTask["priority"]> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const apiToStatus: Record<ApiTaskStatus, WorkspaceTaskStatus> = {
  TODO: "todo",
  IN_PROGRESS: "inProgress",
  DONE: "done",
};

const statusToApi: Record<WorkspaceTaskStatus, ApiTaskStatus> = {
  todo: "TODO",
  inProgress: "IN_PROGRESS",
  done: "DONE",
};

function formatDueDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function mapApiTask(task: ApiTask): WorkspaceTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "No description provided.",
    project: task.project.name,
    assignee: task.assignee?.name ?? task.assignee?.email ?? "Unassigned",
    dueDate: formatDueDate(task.dueDate),
    priority: apiToPriority[task.priority],
    status: apiToStatus[task.status],
    tags: task.tags.length ? task.tags : ["Task"],
  };
}

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return data?.error ?? fallback;
}

export function TaskBoard() {
  const router = useRouter();
  const [items, setItems] = useState<WorkspaceTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] =
    useState<WorkspaceTask["priority"]>("Medium");

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      tasks: items.filter((task) => task.status === column.id),
    }));
  }, [items]);

  async function loadProjects() {
    setIsLoadingProjects(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setProjects([]);
        setSelectedProjectId("");
        setError("Sign in to load saved workspace tasks.");
        return;
      }

      if (!response.ok) {
        throw new Error(await readError(response, "Could not load projects."));
      }

      const data = (await response.json()) as { projects: Project[] };

      setProjects(data.projects);
      setSelectedProjectId((current) => current || data.projects[0]?.id || "");
    } catch (loadError) {
      setProjects([]);
      setSelectedProjectId("");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load projects.",
      );
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadTasks(projectId = selectedProjectId) {
    setIsLoadingTasks(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (projectId) {
        params.set("projectId", projectId);
      }

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setItems([]);
        setError("Sign in to load saved workspace tasks.");
        return;
      }

      if (!response.ok) {
        throw new Error(await readError(response, "Could not load tasks."));
      }

      const data = (await response.json()) as { tasks: ApiTask[] };
      setItems(data.tasks.map(mapApiTask));
    } catch (loadError) {
      setItems([]);
      setError(
        loadError instanceof Error ? loadError.message : "Could not load tasks.",
      );
    } finally {
      setIsLoadingTasks(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadTasks(selectedProjectId);
  }, [selectedProjectId]);

  async function persistStatus(taskId: string, status: WorkspaceTaskStatus) {
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId,
        status: statusToApi[status],
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Could not save task status."));
    }

    const data = (await response.json()) as { task: ApiTask };
    return mapApiTask(data.task);
  }

  async function moveTask(taskId: string, status: WorkspaceTaskStatus) {
    const previousItems = items;

    setItems((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );

    setBusyTaskId(taskId);
    setError(null);

    try {
      const updatedTask = await persistStatus(taskId, status);

      setItems((current) =>
        current.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      router.refresh();
    } catch (moveError) {
      setItems(previousItems);
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Could not save task status.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  function onDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  }

  function onDrop(event: DragEvent<HTMLElement>, status: WorkspaceTaskStatus) {
    event.preventDefault();

    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;

    if (taskId) {
      void moveTask(taskId, status);
    }

    setDraggingTaskId(null);
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!selectedProjectId) {
      setError("Create or select a project before adding tasks.");
      return;
    }

    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: trimmedTitle,
          description: "Created from the NexusBase Kanban board.",
          priority: priorityToApi[priority],
          status: "TODO",
          tags: ["Kanban"],
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Could not create task."));
      }

      const data = (await response.json()) as { task: ApiTask };
      setItems((current) => [mapApiTask(data.task), ...current]);
      setTitle("");
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create task.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTask(task: WorkspaceTask) {
    const confirmed = window.confirm(`Delete "${task.title}"?`);

    if (!confirmed) {
      return;
    }

    setBusyTaskId(task.id);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Could not delete task."));
      }

      setItems((current) => current.filter((item) => item.id !== task.id));
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete task.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight text-nb-text">
            Project Kanban
          </h2>
          <span className="rounded-full bg-nb-surface-alt px-2.5 py-0.5 text-xs font-semibold text-nb-muted">
            {items.length} tasks
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="sl-btn sl-btn--ghost"
            disabled={isLoadingTasks}
            onClick={() => void loadTasks()}
            type="button"
          >
            {isLoadingTasks ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <form
        className="mb-4 grid gap-2 rounded-xl border border-nb-border bg-nb-surface-alt p-3 md:grid-cols-[220px_1fr_160px_auto]"
        onSubmit={createTask}
      >
        <label className="block">
          <span className="sr-only">Project</span>
          <select
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            disabled={isLoadingProjects || isSaving}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            value={selectedProjectId}
          >
            {isLoadingProjects ? <option>Loading projects...</option> : null}
            {!isLoadingProjects && projects.length === 0 ? (
              <option value="">No projects found</option>
            ) : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Task title</span>
          <input
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition placeholder:text-nb-muted focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            disabled={!selectedProjectId || isSaving}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a task, e.g. Build project creation flow"
            value={title}
          />
        </label>

        <label className="block">
          <span className="sr-only">Priority</span>
          <select
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            disabled={!selectedProjectId || isSaving}
            onChange={(event) =>
              setPriority(event.target.value as WorkspaceTask["priority"])
            }
            value={priority}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </label>

        <button
          className="sl-btn sl-btn--primary"
          disabled={!selectedProjectId || isSaving || !title.trim()}
          type="submit"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add task
        </button>
      </form>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-nb-amber bg-nb-amber-light px-3 py-2 text-sm text-nb-amber-dark">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((column) => (
          <div
            key={column.id}
            className="min-h-[360px] rounded-xl border border-nb-border bg-nb-surface-alt p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, column.id)}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-nb-text">
                {column.label}
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-nb-muted">
                {column.tasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {isLoadingTasks ? (
                <div className="rounded-xl border border-nb-border bg-white p-4 text-center text-sm text-nb-muted">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading tasks...
                </div>
              ) : null}

              {!isLoadingTasks &&
                column.tasks.map((task) => {
                  const isBusy = busyTaskId === task.id;

                  return (
                    <article
                      key={task.id}
                      className={cn(
                        "cursor-grab rounded-xl border border-l-4 border-nb-border bg-white p-4 shadow-sm active:cursor-grabbing",
                        column.border,
                        draggingTaskId === task.id && "opacity-60",
                        isBusy && "opacity-70",
                      )}
                      draggable={!isBusy}
                      onDragEnd={() => setDraggingTaskId(null)}
                      onDragStart={(event) => onDragStart(event, task.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold leading-5 text-nb-text">
                          {task.title}
                        </h4>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => void deleteTask(task)}
                            title="Delete task"
                            type="button"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <GripVertical
                            className="h-4 w-4 text-nb-gray-400"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-5 text-nb-muted">
                        {task.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-nb-surface-alt px-2 py-1 text-xs font-medium text-nb-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-nb-muted">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 font-semibold",
                            priorityStyles[task.priority],
                          )}
                        >
                          {task.priority}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {task.dueDate}
                        </span>
                      </div>

                      <div className="mt-3 text-xs font-medium text-nb-muted">
                        {task.assignee} / {task.project}
                      </div>
                    </article>
                  );
                })}

              {!isLoadingTasks && !column.tasks.length ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-white/70 p-4 text-center text-sm text-nb-gray-400">
                  Drop tasks here
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
