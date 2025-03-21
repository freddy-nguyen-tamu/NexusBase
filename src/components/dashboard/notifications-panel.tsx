"use client";

import {
  AlertCircle,
  Bell,
  BellDot,
  Check,
  CheckCheck,
  FileText,
  FolderKanban,
  Loader2,
  MessageCircle,
  MessageSquareText,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "COMMENT_CREATED"
  | "FILE_SHARED"
  | "FILE_UPLOADED"
  | "MEMBER_ADDED"
  | "MESSAGE_CREATED"
  | "PROJECT_UPDATED"
  | "SYSTEM";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
  } | null;
  task: {
    id: string;
    title: string;
  } | null;
  file: {
    id: string;
    name: string;
  } | null;
};

const typeIcons: Record<NotificationType, typeof Bell> = {
  TASK_ASSIGNED: Check,
  TASK_UPDATED: Check,
  COMMENT_CREATED: MessageSquareText,
  FILE_SHARED: FileText,
  FILE_UPLOADED: FileText,
  MEMBER_ADDED: UserPlus,
  MESSAGE_CREATED: MessageCircle,
  PROJECT_UPDATED: FolderKanban,
  SYSTEM: Bell,
};

const typeLabels: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Task assigned",
  TASK_UPDATED: "Task updated",
  COMMENT_CREATED: "Comment",
  FILE_SHARED: "File shared",
  FILE_UPLOADED: "File uploaded",
  MEMBER_ADDED: "Member added",
  MESSAGE_CREATED: "Message",
  PROJECT_UPDATED: "Project",
  SYSTEM: "System",
};

const typeStyles: Record<NotificationType, string> = {
  TASK_ASSIGNED: "bg-blue-50 text-blue-700 ring-blue-100",
  TASK_UPDATED: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  COMMENT_CREATED: "bg-amber-50 text-amber-700 ring-amber-100",
  FILE_SHARED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  FILE_UPLOADED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  MEMBER_ADDED: "bg-violet-50 text-violet-700 ring-violet-100",
  MESSAGE_CREATED: "bg-rose-50 text-rose-700 ring-rose-100",
  PROJECT_UPDATED: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  SYSTEM: "bg-slate-100 text-slate-700 ring-slate-200",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getContext(notification: Notification) {
  const parts = [
    notification.project?.name,
    notification.task?.title,
    notification.file?.name,
  ].filter(Boolean);

  return parts.join(" / ");
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleNotifications = useMemo(() => {
    if (!showUnreadOnly) {
      return notifications;
    }

    return notifications.filter((notification) => !notification.readAt);
  }, [notifications, showUnreadOnly]);

  async function loadNotifications() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (showUnreadOnly) {
        params.set("unread", "true");
      }

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        setError("Sign in to load notifications.");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load notifications.");
      }

      const data = (await response.json()) as {
        notifications: Notification[];
        unreadCount: number;
      };

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, [showUnreadOnly]);

  async function toggleRead(notification: Notification) {
    setBusyId(notification.id);
    setError(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: notification.id,
          read: !notification.readAt,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not update notification.");
      }

      const data = (await response.json()) as {
        notification: Notification;
        unreadCount: number;
      };

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? data.notification : item,
        ),
      );
      setUnreadCount(data.unreadCount);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update notification.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteNotification(notificationId: string) {
    const confirmed = window.confirm("Delete this notification?");

    if (!confirmed) {
      return;
    }

    setBusyId(notificationId);
    setError(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not delete notification.");
      }

      const data = (await response.json()) as {
        unreadCount: number;
      };

      setNotifications((current) =>
        current.filter((notification) => notification.id !== notificationId),
      );
      setUnreadCount(data.unreadCount);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete notification.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setIsMarkingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not mark notifications read.");
      }

      const data = (await response.json()) as {
        notifications: Notification[];
        unreadCount: number;
      };

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Could not mark notifications read.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <section
      id="notifications"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellDot className="h-5 w-5 text-[#be123c]" />
            ) : (
              <Bell className="h-5 w-5 text-[#be123c]" />
            )}
            <h2 className="text-lg font-semibold text-slate-950">
              Notifications
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Assignment, comment, message, member, and file events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            {unreadCount} unread
          </span>

          <button
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold",
              showUnreadOnly
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
            onClick={() => setShowUnreadOnly((current) => !current)}
            type="button"
          >
            {showUnreadOnly ? "Unread only" : "All"}
          </button>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isMarkingAll || unreadCount === 0}
            onClick={() => void markAllRead()}
            type="button"
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </button>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void loadNotifications()}
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
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Loading notifications...
          </div>
        ) : null}

        {!isLoading && visibleNotifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">
              No notifications
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Assignment, comment, file, and message updates will appear here.
            </p>
          </div>
        ) : null}

        {visibleNotifications.map((notification) => {
          const Icon = typeIcons[notification.type];
          const isUnread = !notification.readAt;
          const isBusy = busyId === notification.id;
          const context = getContext(notification);

          return (
            <article
              className={cn(
                "rounded-lg border p-4 transition",
                isUnread
                  ? "border-rose-100 bg-rose-50/70"
                  : "border-slate-200 bg-white",
              )}
              key={notification.id}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1",
                    typeStyles[notification.type],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-950">
                          {notification.title}
                        </h3>
                        {isUnread ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                            New
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {typeLabels[notification.type]} /{" "}
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        disabled={isBusy}
                        onClick={() => void toggleRead(notification)}
                        type="button"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {isUnread ? "Read" : "Unread"}
                      </button>

                      <button
                        className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                        disabled={isBusy}
                        onClick={() => void deleteNotification(notification.id)}
                        title="Delete notification"
                        type="button"
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {notification.body}
                  </p>

                  {context ? (
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {context}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
