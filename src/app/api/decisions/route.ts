import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditProjectContent } from "@/lib/permissions";

const decisionStatusValues = ["PROPOSED", "APPROVED", "REJECTED", "SUPERSEDED"] as const;

const listSchema = z.object({
  projectId: z.string().min(1).optional(),
});

const createSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required").max(140),
  context: z.string().max(2000).optional().nullable(),
  decision: z.string().min(1, "Decision is required").max(4000),
  impact: z.string().max(2000).optional().nullable(),
  status: z.enum(decisionStatusValues).default("PROPOSED"),
});

const updateSchema = z.object({
  id: z.string().min(1, "Decision is required"),
  title: z.string().min(1).max(140).optional(),
  context: z.string().max(2000).optional().nullable(),
  decision: z.string().min(1).max(4000).optional(),
  impact: z.string().max(2000).optional().nullable(),
  status: z.enum(decisionStatusValues).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1, "Decision is required"),
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
    select: { role: true },
  });
}

function serializeDecision(decision: any) {
  return {
    id: decision.id,
    projectId: decision.projectId,
    title: decision.title,
    context: decision.context,
    decision: decision.decision,
    impact: decision.impact,
    status: decision.status,
    project: decision.project,
    creator: decision.creator,
    createdAt: decision.createdAt.toISOString(),
    updatedAt: decision.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = listSchema.safeParse({ projectId: searchParams.get("projectId") || undefined });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const decisions = await prisma.decision.findMany({
    where: {
      project: { members: { some: { userId } } },
      ...(parsed.data.projectId ? { projectId: parsed.data.projectId } : {}),
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ decisions: decisions.map(serializeDecision) });
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
    return NextResponse.json({ error: "Only owners, admins, and editors can create decisions" }, { status: 403 });
  }

  const decision = await prisma.decision.create({
    data: {
      projectId: parsed.data.projectId,
      creatorId: userId,
      title: parsed.data.title.trim(),
      context: parsed.data.context?.trim() || null,
      decision: parsed.data.decision.trim(),
      impact: parsed.data.impact?.trim() || null,
      status: parsed.data.status,
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: parsed.data.projectId,
      actorId: userId,
      action: "CREATED",
      summary: `Recorded decision "${decision.title}"`,
      metadata: { decisionId: decision.id, status: decision.status },
    },
  });

  return NextResponse.json({ decision: serializeDecision(decision) }, { status: 201 });
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

  const existing = await prisma.decision.findFirst({
    where: { id: parsed.data.id, project: { members: { some: { userId } } } },
    select: { id: true, projectId: true, title: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Decision not found or access denied" }, { status: 404 });
  }

  const membership = await getMembership(existing.projectId, userId);

  if (!membership || !canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can update decisions" }, { status: 403 });
  }

  const decision = await prisma.decision.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title?.trim(),
      context: parsed.data.context === undefined ? undefined : parsed.data.context?.trim() || null,
      decision: parsed.data.decision?.trim(),
      impact: parsed.data.impact === undefined ? undefined : parsed.data.impact?.trim() || null,
      status: parsed.data.status,
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existing.projectId,
      actorId: userId,
      action: "UPDATED",
      summary: `Updated decision "${decision.title}"`,
      metadata: { decisionId: decision.id, status: decision.status },
    },
  });

  return NextResponse.json({ decision: serializeDecision(decision) });
}

export async function DELETE(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.decision.findFirst({
    where: { id: parsed.data.id, project: { members: { some: { userId } } } },
    select: { id: true, projectId: true, title: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Decision not found or access denied" }, { status: 404 });
  }

  const membership = await getMembership(existing.projectId, userId);

  if (!membership || !canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can delete decisions" }, { status: 403 });
  }

  await prisma.decision.delete({ where: { id: existing.id } });

  await prisma.activityLog.create({
    data: {
      projectId: existing.projectId,
      actorId: userId,
      action: "DELETED",
      summary: `Deleted decision "${existing.title}"`,
      metadata: { decisionId: existing.id },
    },
  });

  return NextResponse.json({ ok: true });
}
