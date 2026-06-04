import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { notifyProjectMembers } from "@/lib/notifications";
import { canEditProjectContent, canManageProject } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const riskSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const riskStatusSchema = z.enum(["OPEN", "WATCHING", "MITIGATED", "CLOSED"]);

const listRisksSchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
});

const createRiskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  ownerId: z.string().optional().nullable(),
  title: z.string().min(1, "Risk title is required").max(160),
  description: z.string().max(2000).optional().nullable(),
  severity: riskSeveritySchema.default("MEDIUM"),
  status: riskStatusSchema.default("OPEN"),
  impact: z.string().max(2000).optional().nullable(),
  mitigation: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateRiskSchema = z.object({
  riskId: z.string().min(1, "Risk is required"),
  ownerId: z.string().optional().nullable(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional().nullable(),
  severity: riskSeveritySchema.optional(),
  status: riskStatusSchema.optional(),
  impact: z.string().max(2000).optional().nullable(),
  mitigation: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const deleteRiskSchema = z.object({
  riskId: z.string().min(1, "Risk is required"),
});

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user.id;
}

async function getProjectMembership(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: {
      role: true,
      projectId: true,
      userId: true,
      project: { select: { id: true, name: true, slug: true } },
    },
  });
}

const riskIncludes = {
  project: { select: { id: true, name: true, slug: true } },
  owner: { select: { id: true, name: true, email: true, image: true } },
  createdBy: { select: { id: true, name: true, email: true, image: true } },
} as const;

function serializeRisk(risk: any) {
  return {
    id: risk.id,
    projectId: risk.projectId,
    ownerId: risk.ownerId,
    createdById: risk.createdById,
    title: risk.title,
    description: risk.description,
    severity: risk.severity,
    status: risk.status,
    impact: risk.impact,
    mitigation: risk.mitigation,
    dueDate: risk.dueDate?.toISOString?.() ?? null,
    resolvedAt: risk.resolvedAt?.toISOString?.() ?? null,
    createdAt: risk.createdAt.toISOString(),
    updatedAt: risk.updatedAt.toISOString(),
    project: risk.project,
    owner: risk.owner,
    createdBy: risk.createdBy,
  };
}

export async function GET(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = listRisksSchema.safeParse({
    projectId: searchParams.get("projectId") || undefined,
    status: searchParams.get("status") || undefined,
    severity: searchParams.get("severity") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const risks = await prisma.projectRisk.findMany({
    where: {
      project: { members: { some: { userId } } },
      ...(parsed.data.projectId ? { projectId: parsed.data.projectId } : {}),
      ...(parsed.data.status && parsed.data.status !== "all" ? { status: parsed.data.status as any } : {}),
      ...(parsed.data.severity && parsed.data.severity !== "all" ? { severity: parsed.data.severity as any } : {}),
    },
    include: riskIncludes,
    orderBy: [{ status: "asc" }, { severity: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ risks: risks.map(serializeRisk) });
}

export async function POST(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = createRiskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const membership = await getProjectMembership(parsed.data.projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }
  if (!canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can create risks" }, { status: 403 });
  }

  if (parsed.data.ownerId) {
    const ownerMembership = await getProjectMembership(parsed.data.projectId, parsed.data.ownerId);
    if (!ownerMembership) {
      return NextResponse.json({ error: "Risk owner must be a member of the project" }, { status: 400 });
    }
  }

  const risk = await prisma.projectRisk.create({
    data: {
      projectId: parsed.data.projectId,
      ownerId: parsed.data.ownerId || null,
      createdById: userId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      severity: parsed.data.severity,
      status: parsed.data.status,
      impact: parsed.data.impact?.trim() || null,
      mitigation: parsed.data.mitigation?.trim() || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      resolvedAt:
        parsed.data.status === "CLOSED" || parsed.data.status === "MITIGATED" ? new Date() : null,
    },
    include: riskIncludes,
  });

  await prisma.activityLog.create({
    data: {
      projectId: parsed.data.projectId,
      actorId: userId,
      action: "CREATED",
      summary: `Created risk "${risk.title}"`,
      metadata: { riskId: risk.id, severity: risk.severity, status: risk.status },
    },
  });

  if (risk.ownerId) {
    await prisma.notification.create({
      data: {
        userId: risk.ownerId,
        actorId: userId,
        type: "SYSTEM",
        title: "Risk assigned",
        body: `You were assigned to "${risk.title}" in ${membership.project.name}.`,
        href: "/dashboard/health",
      },
    });
  }

  await notifyProjectMembers({
    projectId: parsed.data.projectId,
    actorId: userId,
    type: "SYSTEM",
    title: "New project risk",
    body: `${risk.severity} risk created: ${risk.title}`,
    href: "/dashboard/health",
  });

  return NextResponse.json({ risk: serializeRisk(risk) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = updateRiskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const existingRisk = await prisma.projectRisk.findUnique({
    where: { id: parsed.data.riskId },
    include: riskIncludes,
  });

  if (!existingRisk) {
    return NextResponse.json({ error: "Risk not found" }, { status: 404 });
  }

  const membership = await getProjectMembership(existingRisk.projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }
  if (!canEditProjectContent(membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, and editors can update risks" }, { status: 403 });
  }

  if (parsed.data.ownerId) {
    const ownerMembership = await getProjectMembership(existingRisk.projectId, parsed.data.ownerId);
    if (!ownerMembership) {
      return NextResponse.json({ error: "Risk owner must be a member of the project" }, { status: 400 });
    }
  }

  const nextStatus = parsed.data.status ?? existingRisk.status;
  const shouldResolve =
    (nextStatus === "CLOSED" || nextStatus === "MITIGATED") && !existingRisk.resolvedAt;
  const shouldReopen =
    (nextStatus === "OPEN" || nextStatus === "WATCHING") && existingRisk.resolvedAt;

  const risk = await prisma.projectRisk.update({
    where: { id: parsed.data.riskId },
    data: {
      ...(parsed.data.ownerId !== undefined ? { ownerId: parsed.data.ownerId || null } : {}),
      ...(parsed.data.title ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description?.trim() || null } : {}),
      ...(parsed.data.severity ? { severity: parsed.data.severity } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.impact !== undefined ? { impact: parsed.data.impact?.trim() || null } : {}),
      ...(parsed.data.mitigation !== undefined ? { mitigation: parsed.data.mitigation?.trim() || null } : {}),
      ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
      ...(shouldResolve ? { resolvedAt: new Date() } : {}),
      ...(shouldReopen ? { resolvedAt: null } : {}),
    },
    include: riskIncludes,
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingRisk.projectId,
      actorId: userId,
      action: "UPDATED",
      summary: `Updated risk "${risk.title}"`,
      metadata: { riskId: risk.id, severity: risk.severity, status: risk.status },
    },
  });

  return NextResponse.json({ risk: serializeRisk(risk) });
}

export async function DELETE(request: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = deleteRiskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const existingRisk = await prisma.projectRisk.findUnique({
    where: { id: parsed.data.riskId },
    include: riskIncludes,
  });

  if (!existingRisk) {
    return NextResponse.json({ error: "Risk not found" }, { status: 404 });
  }

  const membership = await getProjectMembership(existingRisk.projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }
  if (!canManageProject(membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can delete risks" }, { status: 403 });
  }

  await prisma.projectRisk.delete({ where: { id: parsed.data.riskId } });

  await prisma.activityLog.create({
    data: {
      projectId: existingRisk.projectId,
      actorId: userId,
      action: "DELETED",
      summary: `Deleted risk "${existingRisk.title}"`,
      metadata: { riskId: existingRisk.id },
    },
  });

  return NextResponse.json({ ok: true });
}
