import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const searchQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(25).default(8),
});

type SearchResult = {
  id: string;
  type: "project" | "task" | "file" | "milestone" | "decision" | "message";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  projectId?: string;
  projectName?: string;
  updatedAt?: string;
  createdAt?: string;
};

function textContains(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function compactSubtitle(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function truncate(value: string | null | undefined, max = 120) {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user.id;
}

export async function GET(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? "8",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search request" },
      { status: 400 },
    );
  }

  const query = parsed.data.q;
  const limit = parsed.data.limit;

  if (query.length < 2) {
    return NextResponse.json({ query, results: [], grouped: { projects: [], tasks: [], files: [], milestones: [], decisions: [], messages: [] } });
  }

  const [projects, tasks, files, milestones, decisions, messages] = await Promise.all([
    prisma.project.findMany({
      where: {
        members: { some: { userId } },
        OR: [
          { name: textContains(query) },
          { slug: textContains(query) },
          { description: textContains(query) },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        updatedAt: true,
        _count: { select: { tasks: true, files: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),

    prisma.task.findMany({
      where: {
        project: { members: { some: { userId } } },
        OR: [
          { title: textContains(query) },
          { description: textContains(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        projectId: true,
        project: { select: { name: true, slug: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),

    prisma.fileObject.findMany({
      where: {
        deletedAt: null,
        project: { members: { some: { userId } } },
        OR: [
          { name: textContains(query) },
          { mimeType: textContains(query) },
          { key: textContains(query) },
        ],
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        updatedAt: true,
        projectId: true,
        project: { select: { name: true, slug: true } },
        owner: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),

    prisma.milestone.findMany({
      where: {
        project: { members: { some: { userId } } },
        OR: [
          { title: textContains(query) },
          { description: textContains(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        updatedAt: true,
        projectId: true,
        project: { select: { name: true, slug: true } },
        owner: { select: { name: true, email: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { sortOrder: "asc" }],
      take: limit,
    }),

    prisma.decision.findMany({
      where: {
        project: { members: { some: { userId } } },
        OR: [
          { title: textContains(query) },
          { context: textContains(query) },
          { decision: textContains(query) },
          { impact: textContains(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        context: true,
        decision: true,
        impact: true,
        status: true,
        updatedAt: true,
        projectId: true,
        project: { select: { name: true, slug: true } },
        creator: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),

    prisma.message.findMany({
      where: {
        body: textContains(query),
        channel: {
          project: { members: { some: { userId } } },
        },
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        channel: {
          select: {
            id: true,
            slug: true,
            name: true,
            projectId: true,
            project: { select: { name: true, slug: true } },
          },
        },
        author: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const grouped = {
    projects: projects.map<SearchResult>((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      subtitle: compactSubtitle([p.description, `${p._count.tasks} tasks`, `${p._count.files} files`, `${p._count.members} members`]),
      badge: "Project",
      href: `/dashboard?projectId=${p.id}`,
      projectId: p.id,
      projectName: p.name,
      updatedAt: p.updatedAt.toISOString(),
    })),

    tasks: tasks.map<SearchResult>((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: compactSubtitle([t.project.name, t.assignee?.name ?? t.assignee?.email, t.description ? truncate(t.description) : null]),
      badge: `${t.status.replaceAll("_", " ")} · ${t.priority}`,
      href: `/dashboard/tasks?projectId=${t.projectId}&taskId=${t.id}`,
      projectId: t.projectId,
      projectName: t.project.name,
      updatedAt: t.updatedAt.toISOString(),
    })),

    files: files.map<SearchResult>((f) => ({
      id: f.id,
      type: "file" as const,
      title: f.name,
      subtitle: compactSubtitle([f.project.name, f.mimeType, f.owner?.name ?? f.owner?.email]),
      badge: "File",
      href: `/dashboard/files?projectId=${f.projectId}&fileId=${f.id}`,
      projectId: f.projectId,
      projectName: f.project.name,
      updatedAt: f.updatedAt.toISOString(),
    })),

    milestones: milestones.map<SearchResult>((m) => ({
      id: m.id,
      type: "milestone" as const,
      title: m.title,
      subtitle: compactSubtitle([m.project.name, m.owner?.name ?? m.owner?.email, m.description ? truncate(m.description) : null]),
      badge: m.status,
      href: `/dashboard/roadmap?projectId=${m.projectId}&milestoneId=${m.id}`,
      projectId: m.projectId,
      projectName: m.project.name,
      updatedAt: m.updatedAt.toISOString(),
    })),

    decisions: decisions.map<SearchResult>((d) => ({
      id: d.id,
      type: "decision" as const,
      title: d.title,
      subtitle: compactSubtitle([d.project.name, d.creator?.name ?? d.creator?.email, truncate(d.decision || d.context)]),
      badge: d.status,
      href: `/dashboard/roadmap?projectId=${d.projectId}&decisionId=${d.id}`,
      projectId: d.projectId,
      projectName: d.project.name,
      updatedAt: d.updatedAt.toISOString(),
    })),

    messages: messages.map<SearchResult>((msg) => ({
      id: msg.id,
      type: "message" as const,
      title: truncate(msg.body, 80),
      subtitle: compactSubtitle([msg.channel.project.name, `#${msg.channel.slug}`, msg.author?.name ?? msg.author?.email]),
      badge: "Message",
      href: `/dashboard/messages?projectId=${msg.channel.projectId}&channelId=${msg.channel.id}&messageId=${msg.id}`,
      projectId: msg.channel.projectId,
      projectName: msg.channel.project.name,
      createdAt: msg.createdAt.toISOString(),
    })),
  };

  const results = [
    ...grouped.projects,
    ...grouped.tasks,
    ...grouped.files,
    ...grouped.milestones,
    ...grouped.decisions,
    ...grouped.messages,
  ];

  return NextResponse.json({ query, results, grouped });
}
