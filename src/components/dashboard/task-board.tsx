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
    border: "border-l-[#2563eb]",
  },
  {
    id: "inProgress",
    apiStatus: "IN_PROGRESS",
    label: "In Progress",
    border: "border-l-[#d97706]",
  },
  {
    id: "done",
    apiStatus: "DONE",
    label: "Done",
    border: "border-l-[#0f766e]",
  },
];

const priorityStyles: Record<WorkspaceTask["priority"], string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-50 text-blue-700",
  High: "bg-amber-50 text-amber-700",
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Project Kanban
          </h2>
          <p className="text-sm text-slate-500">
            Create tasks and drag cards between columns to update status.
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-700">
            Connected to saved workspace tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {items.length} tracked tasks
          </span>
        </div>
      </div>

      <form
        className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[220px_1fr_160px_auto]"
        onSubmit={createTask}
      >
        <label className="block">
          <span className="sr-only">Project</span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
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
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={!selectedProjectId || isSaving}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a task, e.g. Build project creation flow"
            value={title}
          />
        </label>

        <label className="block">
          <span className="sr-only">Priority</span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
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
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((column) => (
          <div
            key={column.id}
            className="min-h-[360px] rounded-lg border border-slate-200 bg-slate-50 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, column.id)}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                {column.label}
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                {column.tasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {isLoadingTasks ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
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
                        "cursor-grab rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing",
                        column.border,
                        draggingTaskId === task.id && "opacity-60",
                        isBusy && "opacity-70",
                      )}
                      draggable={!isBusy}
                      onDragEnd={() => setDraggingTaskId(null)}
                      onDragStart={(event) => onDragStart(event, task.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-semibold leading-5 text-slate-950">
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
                            className="h-4 w-4 text-slate-300"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-5 text-slate-500">
                        {task.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
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

                      <div className="mt-3 text-xs font-medium text-slate-500">
                        {task.assignee} / {task.project}
                      </div>
                    </article>
                  );
                })}

              {!isLoadingTasks && !column.tasks.length ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-400">
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
