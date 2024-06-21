import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const taskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      project: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      assignee: {
        select: { id: true, name: true, image: true, email: true },
      },
      project: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = taskSchema.parse(await request.json());

  const task = await prisma.task.create({
    data: {
      projectId: payload.projectId,
      creatorId: session.user.id,
      assigneeId: payload.assigneeId,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      tags: [],
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: payload.projectId,
      taskId: task.id,
      actorId: session.user.id,
      action: "CREATED",
      summary: `Created task "${task.title}"`,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
