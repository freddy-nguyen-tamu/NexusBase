"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";
import { emit } from "@/lib/events";

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

type CommentAuthor = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type TaskComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  taskId: string;
  projectId: string;
  author: CommentAuthor;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAuthorName(author: CommentAuthor) {
  return author.name ?? author.email ?? "Unknown user";
}

function getInitials(author: CommentAuthor) {
  const label = getAuthorName(author);
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function TaskComments() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [body, setBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [tasks, selectedTaskId]);

  async function loadTasks() {
    setIsLoadingTasks(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setError("Sign in to use task comments.");
        setTasks([]);
        setSelectedTaskId("");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load tasks.");
      }

      const data = (await response.json()) as { tasks: ApiTask[] };

      setTasks(data.tasks);
      setSelectedTaskId((current) => current || data.tasks[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load tasks.",
      );
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function loadComments(taskId: string) {
    if (!taskId) {
      setComments([]);
      return;
    }

    setIsLoadingComments(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments?taskId=${taskId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not load comments.");
      }

      const data = (await response.json()) as { comments: TaskComment[] };

      setComments(data.comments);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load comments.",
      );
    } finally {
      setIsLoadingComments(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      void loadComments(selectedTaskId);
    } else {
      setComments([]);
    }
  }, [selectedTaskId]);

  async function createComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!selectedTaskId) {
      setError("Select a task before adding a comment.");
      return;
    }

    if (!trimmedBody) {
      setError("Comment cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: selectedTaskId,
          body: trimmedBody,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not add comment.");
      }

      const data = (await response.json()) as { comment: TaskComment };

      setComments((current) => [...current, data.comment]);
      setBody("");
      emit("activity");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not add comment.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(comment: TaskComment) {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  }

  function cancelEditing() {
    setEditingCommentId(null);
    setEditingBody("");
  }

  async function updateComment(commentId: string) {
    const trimmedBody = editingBody.trim();

    if (!trimmedBody) {
      setError("Comment cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
          body: trimmedBody,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not update comment.");
      }

      const data = (await response.json()) as { comment: TaskComment };

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? data.comment : comment,
        ),
      );

      cancelEditing();
      emit("activity");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update comment.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteComment(commentId: string) {
    const confirmed = window.confirm("Delete this comment?");

    if (!confirmed) {
      return;
    }

    setDeletingCommentId(commentId);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not delete comment.");
      }

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
      emit("activity");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete comment.",
      );
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[#2563eb]" />
            <h2 className="text-lg font-semibold text-slate-950">
              Task comments
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Add threaded work notes to tasks and record collaboration activity.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoadingTasks || isLoadingComments || !selectedTaskId}
          onClick={() => void loadComments(selectedTaskId)}
          type="button"
        >
          {isLoadingComments ? (
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

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Select task
          </span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={isLoadingTasks}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            value={selectedTaskId}
          >
            {isLoadingTasks ? <option>Loading tasks...</option> : null}

            {!isLoadingTasks && tasks.length === 0 ? (
              <option value="">No tasks found</option>
            ) : null}

            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} · {task.project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingTasks}
            onClick={() => void loadTasks()}
            type="button"
          >
            {isLoadingTasks ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reload tasks
          </button>
        </div>
      </div>

      {selectedTask ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current task
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {selectedTask.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTask.description ?? "No description provided."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {selectedTask.project.name}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {selectedTask.status.replace("_", " ")}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {selectedTask.priority}
            </span>
          </div>
        </div>
      ) : null}

      <form className="mb-4" onSubmit={createComment}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            New comment
          </span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={!selectedTaskId || isSaving}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write an update, question, blocker, or handoff note..."
            value={body}
          />
        </label>

        <div className="mt-2 flex justify-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedTaskId || isSaving || !body.trim()}
            type="submit"
          >
            {isSaving && !editingCommentId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Add comment
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {isLoadingComments ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Loading comments...
          </div>
        ) : null}

        {!isLoadingComments && selectedTaskId && comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">
              No comments yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Start the discussion with a task update or blocker.
            </p>
          </div>
        ) : null}

        {comments.map((comment) => {
          const isEditing = editingCommentId === comment.id;
          const wasEdited = comment.updatedAt !== comment.createdAt;

          return (
            <article
              className="rounded-lg border border-slate-200 bg-white p-4"
              key={comment.id}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                  {getInitials(comment.author)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {getAuthorName(comment.author)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(comment.createdAt)}
                        {wasEdited ? " · edited" : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            disabled={isSaving}
                            onClick={() => void updateComment(comment.id)}
                            title="Save comment"
                            type="button"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            onClick={cancelEditing}
                            title="Cancel edit"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            onClick={() => startEditing(comment)}
                            title="Edit comment"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50",
                              deletingCommentId === comment.id &&
                                "cursor-not-allowed opacity-60",
                            )}
                            disabled={deletingCommentId === comment.id}
                            onClick={() => void deleteComment(comment.id)}
                            title="Delete comment"
                            type="button"
                          >
                            {deletingCommentId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                      onChange={(event) => setEditingBody(event.target.value)}
                      value={editingBody}
                    />
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {comment.body}
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
