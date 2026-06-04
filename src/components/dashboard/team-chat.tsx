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
import { emit } from "@/lib/events";

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

type ChatChannel = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
};

type ChatMessage = {
  id: string;
  body: string;
  channelId: string;
  projectId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: ChatAuthor;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
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
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
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
      setSelectedChannel(null);
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
        channel: ChatChannel;
        currentUserId: string;
        currentUserRole: MemberRole;
      };

      setCurrentUserId(data.currentUserId);
      setCurrentUserRole(data.currentUserRole);
      setSelectedChannel(data.channel);

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
          channelId: selectedChannel?.id,
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
      emit("activity");
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
      emit("activity");
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
      emit("activity");
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
    <section className="rounded-xl border border-nb-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-nb-navy" />
            <h2 className="text-lg font-semibold text-nb-text">
              Team chat
            </h2>
          </div>
          <p className="mt-1 text-sm text-nb-muted">
            Project-scoped chat with member access checks and auto-refresh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold",
              autoRefresh
                ? "border-nb-green bg-nb-green-pale text-nb-green-dark"
                : "border-nb-border text-nb-muted hover:bg-nb-surface-alt",
            )}
            onClick={() => setAutoRefresh((current) => !current)}
            type="button"
          >
            {autoRefresh ? "Live refresh on" : "Live refresh off"}
          </button>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-nb-border px-3 text-xs font-semibold text-nb-muted hover:border-nb-navy-border hover:bg-nb-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-nb-orange/30 bg-orange-50 px-3 py-2 text-sm text-nb-orange">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-nb-border bg-nb-surface-alt p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-nb-muted">
            Project channel
          </span>
          <select
            className="h-10 w-full rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
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
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-nb-border px-3 text-sm font-semibold text-nb-muted hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="mb-4 rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-muted">
          Channel:{" "}
          <span className="font-semibold text-nb-text">
            #{selectedChannel?.slug ?? "loading"}
          </span>
          {" · "}
          <span className="font-semibold text-nb-text">
            {selectedChannel?.name ?? selectedProject.name}
          </span>
          {" · "}
          Your role:{" "}
          <span className="font-semibold text-nb-text">
            {currentUserRole ?? "Unknown"}
          </span>
        </div>
      ) : null}

      <div className="mb-4 h-[420px] overflow-y-auto rounded-lg border border-nb-border bg-nb-surface-alt p-3">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-sm text-nb-muted">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading messages...
            </div>
          </div>
        ) : null}

        {!isLoadingMessages && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageCircle className="mx-auto mb-3 h-9 w-9 text-nb-gray-400" />
              <h3 className="text-sm font-semibold text-nb-text">
                No messages yet
              </h3>
              <p className="mt-1 text-sm text-nb-muted">
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
                  "flex gap-3 rounded-2xl border p-3",
                  isMine
                    ? "bg-nb-navy text-white border-nb-navy"
                    : "bg-nb-surface-alt text-nb-text border-nb-border",
                )}
                key={message.id}
              >
                <div className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold",
                  isMine ? "bg-white/20 text-white" : "bg-white border border-nb-border text-nb-text",
                )}>
                  {getInitials(message.author)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className={cn("text-sm font-semibold", isMine ? "text-white" : "text-nb-text")}>
                        {getAuthorName(message.author)}
                        {isMine ? (
                          <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", isMine ? "bg-white/20 text-white" : "bg-nb-navy/10 text-nb-navy")}>
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className={cn("text-xs", isMine ? "text-white/60" : "text-nb-muted")}>
                        {formatTime(message.createdAt)}
                        {wasEdited ? " · edited" : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-nb-green-dark hover:bg-nb-green-pale disabled:opacity-50"
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
                            className="grid h-8 w-8 place-items-center rounded-lg text-nb-muted hover:bg-nb-surface-alt"
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
                              className={cn("grid h-8 w-8 place-items-center rounded-lg", isMine ? "text-white/60 hover:bg-white/10" : "text-nb-muted hover:bg-nb-surface-alt")}
                              onClick={() => startEditing(message)}
                              title="Edit message"
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}

                          {canDelete ? (
                            <button
                              className={cn("grid h-8 w-8 place-items-center rounded-lg disabled:opacity-50", isMine ? "text-white/60 hover:bg-white/10 hover:text-rose-300" : "text-rose-500 hover:bg-rose-50")}
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
                      className="mt-3 min-h-24 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
                      onChange={(event) => setEditingBody(event.target.value)}
                      value={editingBody}
                    />
                  ) : (
                    <p className={cn("mt-3 whitespace-pre-wrap text-sm leading-6", isMine ? "text-white/90" : "text-nb-text")}>
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
            className="min-h-12 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition placeholder:text-nb-muted focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
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
            className="sl-btn sl-btn--primary h-12"
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
