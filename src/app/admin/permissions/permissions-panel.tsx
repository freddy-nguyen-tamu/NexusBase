"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Shield,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type UserRole = "USER" | "ADMIN";

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  disabledAt: string | null;
  createdAt: string;
  _count: {
    projectMemberships: number;
    tasksCreated: number;
    tasksAssigned: number;
    files: number;
    comments: number;
    messages: number;
    notifications: number;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getUserName(user: Pick<AdminUser, "name" | "email">) {
  return user.name ?? user.email ?? "Unknown user";
}

function getInitials(user: Pick<AdminUser, "name" | "email">) {
  return getUserName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function PermissionsPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin?view=users", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not load users.");
      }

      const data = (await response.json()) as { users: AdminUser[] };
      setUsers(data.users);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function updateUser(input: {
    userId: string;
    role?: UserRole;
    suspended?: boolean;
  }) {
    setBusyUserId(input.userId);
    setError(null);

    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not update user.");
      }

      const data = (await response.json()) as { user: AdminUser };

      setUsers((current) =>
        current.map((user) => (user.id === input.userId ? data.user : user)),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update user.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    const confirmed = window.confirm(
      `Delete ${getUserName(user)}? This permanently removes the user record and related account data.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyUserId(user.id);
    setError(null);

    try {
      const response = await fetch("/api/admin", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not delete user.");
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete user.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-nb-border bg-white py-20">
        <div className="flex items-center gap-2 text-sm text-nb-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-nb-orange/30 bg-orange-50 px-4 py-3 text-sm text-nb-orange">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-nb-border bg-white py-20">
        <Users className="mb-3 h-8 w-8 text-nb-gray-400" />
        <h3 className="text-sm font-semibold text-nb-text">No users found</h3>
        <p className="mt-1 text-sm text-nb-muted">
          There are no registered users yet.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-nb-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-nb-surface-alt text-xs font-bold uppercase tracking-widest text-nb-muted">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Member Since</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-nb-border">
            {users.map((user) => {
              const isBusy = busyUserId === user.id;
              const suspended = Boolean(user.disabledAt);

              return (
                <tr key={user.id} className="group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-nb-surface-alt text-xs font-bold text-nb-text">
                        {getInitials(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-nb-text">
                          {getUserName(user)}
                        </p>
                        <p className="truncate text-xs text-nb-muted">
                          {user.email ?? "No email"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="relative inline-flex items-center">
                      <Shield className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-nb-muted" />
                      <select
                        className={cn(
                          "h-9 appearance-none rounded-lg border bg-white pl-8 pr-8 text-xs font-semibold text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20 disabled:cursor-not-allowed disabled:opacity-60",
                          user.role === "ADMIN"
                            ? "border-nb-navy/20"
                            : "border-nb-border",
                        )}
                        disabled={isBusy}
                        onChange={(event) =>
                          void updateUser({
                            userId: user.id,
                            role: event.target.value as UserRole,
                          })
                        }
                        value={user.role}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        suspended
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {suspended ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {suspended ? "Suspended" : "Active"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-nb-muted">
                    {formatDate(user.createdAt)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                          suspended
                            ? "border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                            : "border-amber-100 text-amber-700 hover:bg-amber-50",
                        )}
                        disabled={isBusy}
                        onClick={() =>
                          void updateUser({
                            userId: user.id,
                            suspended: !suspended,
                          })
                        }
                        type="button"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {suspended ? "Unsuspend" : "Suspend"}
                      </button>

                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-100 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isBusy}
                        onClick={() => void deleteUser(user)}
                        type="button"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
