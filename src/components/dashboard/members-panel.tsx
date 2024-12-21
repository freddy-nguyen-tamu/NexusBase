"use client";

import {
  AlertCircle,
  Crown,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

const roleStyles: Record<MemberRole, string> = {
  OWNER: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ADMIN: "bg-blue-50 text-blue-700 ring-blue-100",
  EDITOR: "bg-amber-50 text-amber-700 ring-amber-100",
  VIEWER: "bg-slate-100 text-slate-600 ring-slate-200",
};

const roleDescriptions: Record<MemberRole, string> = {
  OWNER: "Full project control, including deletion and ownership.",
  ADMIN: "Can manage project settings, files, tasks, and members.",
  EDITOR: "Can create and update project work, files, comments, and tasks.",
  VIEWER: "Can view shared project data without changing workspace records.",
};

const editableRoles: Array<Exclude<MemberRole, "OWNER">> = [
  "ADMIN",
  "EDITOR",
  "VIEWER",
];

function getDisplayName(member: ProjectMember) {
  return member.user.name ?? member.user.email ?? "Unknown user";
}

function getInitials(member: ProjectMember) {
  return getDisplayName(member)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function canManageMembers(role: string | null) {
  return role === "OWNER" || role === "ADMIN";
}

function canEditTarget(actorRole: string | null, targetRole: MemberRole) {
  if (targetRole === "OWNER") {
    return false;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return targetRole === "EDITOR" || targetRole === "VIEWER";
  }

  return false;
}

export function MembersPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<MemberRole, "OWNER">>("VIEWER");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const roleCounts = useMemo(() => {
    return members.reduce(
      (counts, member) => {
        counts[member.role] += 1;
        return counts;
      },
      {
        OWNER: 0,
        ADMIN: 0,
        EDITOR: 0,
        VIEWER: 0,
      } satisfies Record<MemberRole, number>,
    );
  }, [members]);

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
        setError("Sign in to manage project members.");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load projects.");
      }

      const data = (await response.json()) as { projects: Project[] };

      setProjects(data.projects);
      setSelectedProjectId((current) => current || data.projects[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load projects.",
      );
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadMembers(projectId = selectedProjectId) {
    if (!projectId) {
      setMembers([]);
      setCurrentUserRole(null);
      return;
    }

    setIsLoadingMembers(true);
    setError(null);

    try {
      const response = await fetch(`/api/project-members?projectId=${projectId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not load project members.");
      }

      const data = (await response.json()) as {
        members: ProjectMember[];
        currentUserRole: MemberRole;
      };

      setMembers(data.members);
      setCurrentUserRole(data.currentUserRole);
    } catch (loadError) {
      setMembers([]);
      setCurrentUserRole(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load project members.",
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadMembers(selectedProjectId);
  }, [selectedProjectId]);

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProjectId) {
      setError("Select a project before adding a member.");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/project-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          email: trimmedEmail,
          role,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not add project member.");
      }

      const data = (await response.json()) as { member: ProjectMember };

      setMembers((current) => [...current, data.member]);
      setEmail("");
      setRole("VIEWER");
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Could not add project member.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRole(
    membershipId: string,
    nextRole: Exclude<MemberRole, "OWNER">,
  ) {
    setBusyMemberId(membershipId);
    setError(null);

    try {
      const response = await fetch("/api/project-members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membershipId,
          role: nextRole,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not update member role.");
      }

      const data = (await response.json()) as { member: ProjectMember };

      setMembers((current) =>
        current.map((member) =>
          member.id === membershipId ? data.member : member,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update member role.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  async function removeMember(member: ProjectMember) {
    const confirmed = window.confirm(
      `Remove ${getDisplayName(member)} from this project?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyMemberId(member.id);
    setError(null);

    try {
      const response = await fetch("/api/project-members", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membershipId: member.id,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not remove member.");
      }

      setMembers((current) => current.filter((item) => item.id !== member.id));
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove member.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">
              Sharing & permissions
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Invite existing users to projects and control access with owner,
            admin, editor, and viewer roles.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoadingProjects || isLoadingMembers}
          onClick={() => void loadMembers(selectedProjectId)}
          type="button"
        >
          {isLoadingMembers ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[240px_1fr_150px_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project
          </span>
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

        <form className="contents" onSubmit={addMember}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              User email
            </span>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
              disabled={
                !selectedProjectId ||
                !canManageMembers(currentUserRole) ||
                isSaving
              }
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
              disabled={
                !selectedProjectId ||
                !canManageMembers(currentUserRole) ||
                isSaving
              }
              onChange={(event) =>
                setRole(event.target.value as Exclude<MemberRole, "OWNER">)
              }
              value={role}
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
              disabled={
                !selectedProjectId ||
                !email.trim() ||
                !canManageMembers(currentUserRole) ||
                isSaving
              }
              type="submit"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </button>
          </div>
        </form>
      </div>

      {selectedProject ? (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          {(["OWNER", "ADMIN", "EDITOR", "VIEWER"] as MemberRole[]).map(
            (item) => (
              <div
                className="rounded-lg border border-slate-200 bg-white p-3"
                key={item}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {item}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {roleCounts[item]}
                </p>
              </div>
            ),
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {isLoadingMembers ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading members...
            </div>
          ) : null}

          {!isLoadingMembers && members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-800">
                No members found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a project or create one before managing access.
              </p>
            </div>
          ) : null}

          {members.map((member) => {
            const isBusy = busyMemberId === member.id;
            const canEditThisMember = canEditTarget(
              currentUserRole,
              member.role,
            );

            return (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4"
                key={member.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                      {member.role === "OWNER" ? (
                        <Crown className="h-5 w-5 text-emerald-600" />
                      ) : (
                        getInitials(member)
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {getDisplayName(member)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {member.user.email ?? "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                        roleStyles[member.role],
                      )}
                    >
                      {member.role}
                    </span>

                    {member.role === "OWNER" ? (
                      <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Protected
                      </span>
                    ) : (
                      <>
                        <select
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canEditThisMember || isBusy}
                          onChange={(event) =>
                            void updateRole(
                              member.id,
                              event.target
                                .value as Exclude<MemberRole, "OWNER">,
                            )
                          }
                          value={member.role}
                        >
                          {editableRoles.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <button
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-100 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canEditThisMember || isBusy}
                          onClick={() => void removeMember(member)}
                          type="button"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {roleDescriptions[member.role]}
                </p>
              </article>
            );
          })}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[#2563eb]" />
            <h3 className="text-sm font-semibold text-slate-950">
              Permission rules
            </h3>
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-900">Owner</p>
              <p className="mt-1 text-xs leading-5">
                Full control. Cannot be removed here to prevent orphaned
                projects.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-900">Admin</p>
              <p className="mt-1 text-xs leading-5">
                Can manage members and workspace records, except owners.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-900">Editor</p>
              <p className="mt-1 text-xs leading-5">
                Can create and update tasks, comments, and files.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-900">Viewer</p>
              <p className="mt-1 text-xs leading-5">
                Can view project content without changing records.
              </p>
            </div>
          </div>

          {selectedProject ? (
            <p className="mt-4 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
              Current project:{" "}
              <span className="font-semibold text-slate-800">
                {selectedProject.name}
              </span>
              . Your role:{" "}
              <span className="font-semibold text-slate-800">
                {currentUserRole ?? "Unknown"}
              </span>
              .
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
