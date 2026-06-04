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
import { emit } from "@/lib/events";

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
  OWNER: "bg-nb-green-pale text-nb-green-dark",
  ADMIN: "bg-nb-navy/10 text-nb-navy",
  EDITOR: "bg-amber-50 text-amber-700",
  VIEWER: "bg-nb-surface-alt text-nb-muted",
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
      emit("activity");
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
      emit("activity");
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
      emit("activity");
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
    <section className="sl-card p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-nb-navy" />
            <h2 className="text-lg font-semibold text-nb-text">
              Projects
            </h2>
          </div>
          <p className="mt-1 text-sm text-nb-muted">
            Create workspaces that tasks, files, comments, and members can
            attach to.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-nb-border px-3 text-xs font-semibold text-nb-muted hover:border-nb-navy-border hover:bg-nb-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
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
        className="mb-4 grid gap-2 rounded-lg border border-nb-border bg-nb-surface-alt p-3 lg:grid-cols-[220px_1fr_auto]"
        onSubmit={createProject}
      >
        <label className="block">
          <span className="sr-only">Project name</span>
          <input
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition placeholder:text-nb-muted focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            value={name}
          />
        </label>

        <label className="block">
          <span className="sr-only">Project description</span>
          <input
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition placeholder:text-nb-muted focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description, e.g. Q2 launch workspace"
            value={description}
          />
        </label>

        <button
          className="sl-btn sl-btn--primary"
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
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-nb-orange/30 bg-orange-50 px-3 py-2 text-sm text-nb-orange">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-lg border border-nb-border bg-nb-surface-alt p-6 text-center text-sm text-nb-muted">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading projects...
            </div>
          ) : null}

          {!isLoading && projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-nb-border bg-nb-surface-alt p-6 text-center">
              <FolderKanban className="mx-auto mb-3 h-8 w-8 text-nb-gray-400" />
              <h3 className="text-sm font-semibold text-nb-text">
                No projects yet
              </h3>
              <p className="mt-1 text-sm text-nb-muted">
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
                    "rounded-xl border bg-white p-4 transition hover:border-nb-green",
                    isSelected
                      ? "border-nb-green ring-2 ring-nb-green/10"
                      : "border-nb-border",
                  )}
                  key={project.id}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="h-10 w-full rounded-lg border border-nb-border px-3 text-sm font-semibold text-nb-text outline-none focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
                        onChange={(event) => setEditName(event.target.value)}
                        value={editName}
                      />

                      <textarea
                        className="min-h-20 w-full rounded-lg border border-nb-border px-3 py-2 text-sm text-nb-text outline-none focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        value={editDescription}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="sl-btn sl-btn--primary"
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
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-nb-border px-3 text-xs font-semibold text-nb-muted hover:bg-nb-surface-alt"
                          onClick={cancelEditing}
                          type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="min-w-0 text-left"
                        onClick={() => setSelectedProjectId(project.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-nb-text">
                            {project.name}
                          </h3>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-nb-green-dark" />
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs text-nb-muted">
                          /{project.slug}
                        </p>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg text-nb-muted hover:bg-nb-surface-alt"
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
                          className="grid h-8 w-8 place-items-center rounded-lg text-nb-muted hover:bg-nb-surface-alt"
                          title="More project actions"
                          type="button"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-5 text-nb-muted">
                      {project.description || "No project description yet."}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs text-nb-muted sm:grid-cols-3">
                      <div className="rounded-lg bg-nb-surface-alt px-3 py-2">
                        <strong className="block text-nb-text">
                          {project._count.tasks}
                        </strong>
                        Tasks
                      </div>
                      <div className="rounded-lg bg-nb-surface-alt px-3 py-2">
                        <strong className="block text-nb-text">
                          {project._count.files}
                        </strong>
                        Files
                      </div>
                      <div className="rounded-lg bg-nb-surface-alt px-3 py-2">
                        <strong className="block text-nb-text">
                          {project.members.length}
                        </strong>
                        Members
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-nb-muted">
                      <span>
                        Owner:{" "}
                        <strong className="text-nb-text">
                          {getMemberName(owner)}
                        </strong>
                      </span>
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <aside className="rounded-xl border border-nb-border bg-nb-surface-alt p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-nb-navy" />
            <h3 className="text-sm font-semibold text-nb-text">
              Project members
            </h3>
          </div>

          {selectedProject ? (
            <div>
              <p className="mt-1 text-sm text-nb-muted">
                People with access to{" "}
                <span className="font-semibold text-nb-text">
                  {selectedProject.name}
                </span>
                .
              </p>

              <div className="mt-4 space-y-3">

              {selectedProject?.members?.slice(0, 6).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        roleStyles[member.role] ?? roleStyles.VIEWER,
                      )}
                    >
                      {member.role}
                    </span>
                    <p className="truncate text-sm text-nb-muted">
                      {getMemberName(member)}
                    </p>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-nb-muted">
              Select a project to inspect members and roles.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
