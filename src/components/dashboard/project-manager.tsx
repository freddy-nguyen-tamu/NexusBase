"use client";

import {
  AlertCircle,
  CheckCircle2,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";

type ProjectMember = {
  id: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  _count: {
    tasks: number;
    files: number;
    activityLogs: number;
  };
};

const roleStyles: Record<string, string> = {
  OWNER: "bg-emerald-50 text-emerald-700",
  ADMIN: "bg-blue-50 text-blue-700",
  EDITOR: "bg-amber-50 text-amber-700",
  VIEWER: "bg-slate-100 text-slate-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getOwner(project: Project) {
  return (
    project.members.find((member) => member.role === "OWNER") ??
    project.members[0] ??
    null
  );
}

function getMemberName(member: ProjectMember | null) {
  if (!member) {
    return "Unknown";
  }

  return member.user.name ?? member.user.email ?? "Unknown";
}

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  async function loadProjects() {
    setIsLoading(true);
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
        setSelectedProjectId(null);
        setError("Sign in to load and manage real projects.");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load projects.");
      }

      const data = (await response.json()) as { projects: Project[] };

      setProjects(data.projects);
      setSelectedProjectId((current) => current ?? data.projects[0]?.id ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load projects.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not create project.");
      }

      const data = (await response.json()) as { project: Project };

      setProjects((current) => [data.project, ...current]);
      setSelectedProjectId(data.project.id);
      setName("");
      setDescription("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create project.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(project: Project) {
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }

  function cancelEditing() {
    setEditingProjectId(null);
    setEditName("");
    setEditDescription("");
  }

  async function updateProject(projectId: string) {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          name: trimmedName,
          description: editDescription.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not update project.");
      }

      const data = (await response.json()) as { project: Project };

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId ? data.project : project,
        ),
      );

      cancelEditing();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update project.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${project.name}"? This will remove the project and related workspace records.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingId(projectId);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not delete project.");
      }

      setProjects((current) => current.filter((item) => item.id !== projectId));

      if (selectedProjectId === projectId) {
        const nextProject = projects.find((item) => item.id !== projectId);
        setSelectedProjectId(nextProject?.id ?? null);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete project.",
      );
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#2563eb]" />
            <h2 className="text-lg font-semibold text-slate-950">
              Projects
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create workspaces that tasks, files, comments, and members can
            attach to.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void loadProjects()}
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

      <form
        className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[220px_1fr_auto]"
        onSubmit={createProject}
      >
        <label className="block">
          <span className="sr-only">Project name</span>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            value={name}
          />
        </label>

        <label className="block">
          <span className="sr-only">Project description</span>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description, e.g. Q2 launch workspace"
            value={description}
          />
        </label>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create
        </button>
      </form>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading projects...
            </div>
          ) : null}

          {!isLoading && projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <FolderKanban className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-800">
                No projects yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Create your first project so tasks and files can attach to a
                real workspace.
              </p>
            </div>
          ) : null}

          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            const isEditing = editingProjectId === project.id;
            const owner = getOwner(project);

            return (
              <article
                className={cn(
                  "rounded-lg border bg-white p-4 transition",
                  isSelected
                    ? "border-[#2563eb] ring-2 ring-[#2563eb]/10"
                    : "border-slate-200 hover:border-slate-300",
                )}
                key={project.id}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                      onChange={(event) => setEditName(event.target.value)}
                      value={editName}
                    />

                    <textarea
                      className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                      onChange={(event) =>
                        setEditDescription(event.target.value)
                      }
                      value={editDescription}
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#10151f] px-3 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60"
                        disabled={isSaving}
                        onClick={() => void updateProject(project.id)}
                        type="button"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </button>

                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        onClick={cancelEditing}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="min-w-0 text-left"
                        onClick={() => setSelectedProjectId(project.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {project.name}
                          </h3>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563eb]" />
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          /{project.slug}
                        </p>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                          onClick={() => startEditing(project)}
                          title="Edit project"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                          disabled={isDeletingId === project.id}
                          onClick={() => void deleteProject(project.id)}
                          title="Delete project"
                          type="button"
                        >
                          {isDeletingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                          title="More project actions"
                          type="button"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-5 text-slate-500">
                      {project.description || "No project description yet."}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <strong className="block text-slate-900">
                          {project._count.tasks}
                        </strong>
                        Tasks
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <strong className="block text-slate-900">
                          {project._count.files}
                        </strong>
                        Files
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <strong className="block text-slate-900">
                          {project.members.length}
                        </strong>
                        Members
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        Owner:{" "}
                        <strong className="text-slate-700">
                          {getMemberName(owner)}
                        </strong>
                      </span>
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0f766e]" />
            <h3 className="text-sm font-semibold text-slate-950">
              Project members
            </h3>
          </div>

          {selectedProject ? (
            <>
              <p className="mt-1 text-sm text-slate-500">
                People with access to{" "}
                <span className="font-semibold text-slate-700">
                  {selectedProject.name}
                </span>
                .
              </p>

              <div className="mt-4 space-y-3">
                {selectedProject.members.map((member) => (
                  <div
                    className="rounded-lg border border-slate-200 bg-white p-3"
                    key={member.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                        {(member.user.name ?? member.user.email ?? "U")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {member.user.name ?? "Unnamed user"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {member.user.email ?? "No email"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "mt-3 inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                        roleStyles[member.role] ?? roleStyles.VIEWER,
                      )}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Select a project to inspect members and roles.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
