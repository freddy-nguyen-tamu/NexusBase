"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type ChatAuthor = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type ChatMessage = {
  id: string;
  body: string;
  projectId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: ChatAuthor;
};

type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAuthorName(author: ChatAuthor) {
  return author.name ?? author.email ?? "Unknown user";
}

function getInitials(author: ChatAuthor) {
  return getAuthorName(author)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function canModerate(role: MemberRole | null) {
  return role === "OWNER" || role === "ADMIN";
}

export function TeamChat() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole | null>(
    null,
  );
  const [body, setBody] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const lastMessageCreatedAt = messages.at(-1)?.createdAt;

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

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
        setError("Sign in to use team chat.");
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

  async function loadMessages({
    projectId = selectedProjectId,
    onlyNew = false,
  }: {
    projectId?: string;
    onlyNew?: boolean;
  } = {}) {
    if (!projectId) {
      setMessages([]);
      setCurrentUserId("");
      setCurrentUserRole(null);
      return;
    }

    setIsLoadingMessages(!onlyNew);
    setError(null);

    try {
      const params = new URLSearchParams({
        projectId,
      });

      if (onlyNew && lastMessageCreatedAt) {
        params.set("after", lastMessageCreatedAt);
      }

      const response = await fetch(`/api/messages?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not load messages.");
      }

      const data = (await response.json()) as {
        messages: ChatMessage[];
        currentUserId: string;
        currentUserRole: MemberRole;
      };

      setCurrentUserId(data.currentUserId);
      setCurrentUserRole(data.currentUserRole);

      if (onlyNew) {
        setMessages((current) => {
          const existingIds = new Set(current.map((message) => message.id));
          const newMessages = data.messages.filter(
            (message) => !existingIds.has(message.id),
          );

          return [...current, ...newMessages];
        });
      } else {
        setMessages(data.messages);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load messages.",
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadMessages({
      projectId: selectedProjectId,
      onlyNew: false,
    });
  }, [selectedProjectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!autoRefresh || !selectedProjectId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadMessages({
        projectId: selectedProjectId,
        onlyNew: true,
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [autoRefresh, selectedProjectId, lastMessageCreatedAt]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!selectedProjectId) {
      setError("Select a project before sending a message.");
      return;
    }

    if (!trimmedBody) {
      setError("Message cannot be empty.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          body: trimmedBody,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not send message.");
      }

      const data = (await response.json()) as { message: ChatMessage };

      setMessages((current) => [...current, data.message]);
      setBody("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send message.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function startEditing(message: ChatMessage) {
    setEditingMessageId(message.id);
    setEditingBody(message.body);
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditingBody("");
  }

  async function updateMessage(messageId: string) {
    const trimmedBody = editingBody.trim();

    if (!trimmedBody) {
      setError("Message cannot be empty.");
      return;
    }

    setBusyMessageId(messageId);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          body: trimmedBody,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not update message.");
      }

      const data = (await response.json()) as { message: ChatMessage };

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? data.message : message,
        ),
      );

      cancelEditing();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update message.",
      );
    } finally {
      setBusyMessageId(null);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    const confirmed = window.confirm("Delete this message?");

    if (!confirmed) {
      return;
    }

    setBusyMessageId(message.id);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: message.id,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not delete message.");
      }

      setMessages((current) =>
        current.filter((item) => item.id !== message.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete message.",
      );
    } finally {
      setBusyMessageId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#2563eb]" />
            <h2 className="text-lg font-semibold text-slate-950">
              Team chat
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Project-scoped chat with member access checks and auto-refresh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold",
              autoRefresh
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
            onClick={() => setAutoRefresh((current) => !current)}
            type="button"
          >
            {autoRefresh ? "Live refresh on" : "Live refresh off"}
          </button>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingMessages || !selectedProjectId}
            onClick={() =>
              void loadMessages({
                projectId: selectedProjectId,
                onlyNew: false,
              })
            }
            type="button"
          >
            {isLoadingMessages ? (
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

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project channel
          </span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={isLoadingProjects}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            value={selectedProjectId}
          >
            {isLoadingProjects ? <option>Loading projects...</option> : null}

            {!isLoadingProjects && projects.length === 0 ? (
              <option value="">No projects found</option>
            ) : null}

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                #{project.slug} · {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingProjects}
            onClick={() => void loadProjects()}
            type="button"
          >
            {isLoadingProjects ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Reload projects
          </button>
        </div>
      </div>

      {selectedProject ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          Channel:{" "}
          <span className="font-semibold text-slate-800">
            #{selectedProject.slug}
          </span>
          {" · "}
          Your role:{" "}
          <span className="font-semibold text-slate-800">
            {currentUserRole ?? "Unknown"}
          </span>
        </div>
      ) : null}

      <div className="mb-4 h-[420px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading messages...
            </div>
          </div>
        ) : null}

        {!isLoadingMessages && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageCircle className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-800">
                No messages yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Start the channel with a project update or question.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((message) => {
            const isMine = message.authorId === currentUserId;
            const isEditing = editingMessageId === message.id;
            const isBusy = busyMessageId === message.id;
            const wasEdited = message.updatedAt !== message.createdAt;
            const canDelete = isMine || canModerate(currentUserRole);

            return (
              <article
                className={cn(
                  "flex gap-3 rounded-lg border p-3",
                  isMine
                    ? "border-blue-100 bg-blue-50/50"
                    : "border-slate-200 bg-white",
                )}
                key={message.id}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                  {getInitials(message.author)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {getAuthorName(message.author)}
                        {isMine ? (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatTime(message.createdAt)}
                        {wasEdited ? " · edited" : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => void updateMessage(message.id)}
                            title="Save message"
                            type="button"
                          >
                            {isBusy ? (
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
                          {isMine ? (
                            <button
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                              onClick={() => startEditing(message)}
                              title="Edit message"
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}

                          {canDelete ? (
                            <button
                              className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                              disabled={isBusy}
                              onClick={() => void deleteMessage(message)}
                              title="Delete message"
                              type="button"
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                      onChange={(event) => setEditingBody(event.target.value)}
                      value={editingBody}
                    />
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {message.body}
                    </p>
                  )}
                </div>
              </article>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={sendMessage}>
        <label className="block">
          <span className="sr-only">Message</span>
          <textarea
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={!selectedProjectId || isSending}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Message this project channel..."
            value={body}
          />
        </label>

        <div className="flex items-start">
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            disabled={!selectedProjectId || isSending || !body.trim()}
            type="submit"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
