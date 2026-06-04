import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditProjectContent } from "@/lib/permissions";

const milestoneStatusValues = [
  "PLANNED",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;

const listSchema = z.object({
  projectId: z.string().min(1).optional(),
});

const createSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(1000).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(milestoneStatusValues).default("PLANNED"),
});

const updateSchema = z.object({
  id: z.string().min(1, "Milestone is required"),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(milestoneStatusValues).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1, "Milestone is required"),
});

async function requireUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

async function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: {
      role: true,
      project: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

function serializeMilestone(milestone: any) {
  const totalTasks = milestone.tasks?.length ?? 0;
  const doneTasks = milestone.tasks?.filter((task: any) => task.status === "DONE").length ?? 0;
  const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return {
    id: milestone.id,
    projectId: milestone.projectId,
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    dueDate: milestone.dueDate?.toISOString?.() ?? null,
    startedAt: milestone.startedAt?.toISOString?.() ?? null,
    completedAt: milestone.completedAt?.toISOString?.() ?? null,
    sortOrder: milestone.sortOrder,
    owner: milestone.owner
      ? {
          id: milestone.owner.id,
          name: milestone.owner.name,
          email: milestone.owner.email,
          image: milestone.owner.image,
        }
      : null,
    project: milestone.project,
    taskCount: totalTasks,
    doneTaskCount: doneTasks,
    progress,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = listSchema.safeParse({
    projectId: searchParams.get("projectId") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const milestones = await prisma.milestone.findMany({
    where: {
      project: {
        members: { some: { userId } },
      },
      ...(parsed.data.projectId ? { projectId: parsed.data.projectId } : {}),
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      owner: { select: { id: true, name: true, email: true, image: true } },
      tasks: { select: { id: true, status: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ milestones: milestones.map(serializeMilestone) });
}

export async function POST(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const membership = await getMembership(parsed.data.projectId, userId);

  if (!membership) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  if (!canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can create milestones" }, { status: 403 });
  }

  const milestone = await prisma.milestone.create({
    data: {
      projectId: parsed.data.projectId,
      creatorId: userId,
      ownerId: parsed.data.ownerId || null,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status,
      startedAt: parsed.data.status === "ACTIVE" ? new Date() : null,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      owner: { select: { id: true, name: true, email: true, image: true } },
      tasks: { select: { id: true, status: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: parsed.data.projectId,
      actorId: userId,
      action: "CREATED",
      summary: `Created milestone "${milestone.title}"`,
      metadata: { milestoneId: milestone.id },
    },
  });

  return NextResponse.json({ milestone: serializeMilestone(milestone) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existing = await prisma.milestone.findFirst({
    where: {
      id: parsed.data.id,
      project: { members: { some: { userId } } },
    },
    select: { id: true, projectId: true, title: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Milestone not found or access denied" }, { status: 404 });
  }

  const membership = await getMembership(existing.projectId, userId);

  if (!membership || !canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can update milestones" }, { status: 403 });
  }

  const nextStatus = parsed.data.status ?? existing.status;

  let completedAt: Date | null | undefined;
  if (nextStatus === "COMPLETED") {
    completedAt = new Date();
  } else if (existing.status === "COMPLETED") {
    completedAt = null;
  }

  const milestone = await prisma.milestone.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title?.trim(),
      description:
        parsed.data.description === undefined ? undefined : parsed.data.description?.trim() || null,
      ownerId: parsed.data.ownerId === undefined ? undefined : parsed.data.ownerId || null,
      dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status,
      startedAt: nextStatus === "ACTIVE" ? new Date() : undefined,
      completedAt,
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      owner: { select: { id: true, name: true, email: true, image: true } },
      tasks: { select: { id: true, status: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existing.projectId,
      actorId: userId,
      action: "UPDATED",
      summary: `Updated milestone "${milestone.title}"`,
      metadata: { milestoneId: milestone.id, status: milestone.status },
    },
  });

  return NextResponse.json({ milestone: serializeMilestone(milestone) });
}

export async function DELETE(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.milestone.findFirst({
    where: {
      id: parsed.data.id,
      project: { members: { some: { userId } } },
    },
    select: { id: true, projectId: true, title: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Milestone not found or access denied" }, { status: 404 });
  }

  const membership = await getMembership(existing.projectId, userId);

  if (!membership || !canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can delete milestones" }, { status: 403 });
  }

  await prisma.milestone.delete({ where: { id: existing.id } });

  await prisma.activityLog.create({
    data: {
      projectId: existing.projectId,
      actorId: userId,
      action: "DELETED",
      summary: `Deleted milestone "${existing.title}"`,
      metadata: { milestoneId: existing.id },
    },
  });

  return NextResponse.json({ ok: true });
}
