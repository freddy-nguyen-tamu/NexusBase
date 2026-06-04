import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { notifyTaskAssignee } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  milestoneId: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
});

const updateTaskSchema = z.object({
  taskId: z.string().min(1, "Task is required"),
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  milestoneId: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const deleteTaskSchema = z.object({
  taskId: z.string().min(1, "Task is required"),
});

async function requireUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      userId: null,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  return {
    userId: session.user.id,
    response: NextResponse.json({ error: "Internal Server Error" }, { status: 500 }),
  };
}

async function assertProjectMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  return membership;
}

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      status: true,
    },
  });

  return task;
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      project: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = createTaskSchema.parse(await request.json());
  const membership = await assertProjectMembership(payload.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "You do not have access to this project" },
      { status: 403 },
    );
  }

  const task = await prisma.task.create({
    data: {
      projectId: payload.projectId,
      creatorId: userId,
      assigneeId: payload.assigneeId || undefined,
      milestoneId: payload.milestoneId || null,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      tags: payload.tags,
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: payload.projectId,
      taskId: task.id,
      actorId: userId,
      action: "CREATED",
      summary: `Created task "${task.title}"`,
    },
  });

  await notifyTaskAssignee({
    assigneeId: task.assignee?.id,
    actorId: userId,
    projectId: task.projectId,
    taskId: task.id,
    taskTitle: task.title,
  });

  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = updateTaskSchema.parse(await request.json());
  const existingTask = await assertTaskAccess(payload.taskId, userId);

  if (!existingTask) {
    return NextResponse.json(
      { error: "Task not found or access denied" },
      { status: 404 },
    );
  }

  const task = await prisma.task.update({
    where: {
      id: payload.taskId,
    },
    data: {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
      ...(payload.assigneeId !== undefined
        ? { assigneeId: payload.assigneeId }
        : {}),
      ...(payload.milestoneId === undefined ? undefined : { milestoneId: payload.milestoneId || null }),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.dueDate !== undefined
        ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null }
        : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingTask.projectId,
      taskId: task.id,
      actorId: userId,
      action: "UPDATED",
      summary:
        payload.status && payload.status !== existingTask.status
          ? `Moved task "${task.title}" to ${payload.status}`
          : `Updated task "${task.title}"`,
    },
  });

  if (payload.assigneeId !== undefined) {
    await notifyTaskAssignee({
      assigneeId: task.assignee?.id,
      actorId: userId,
      projectId: task.projectId,
      taskId: task.id,
      taskTitle: task.title,
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = deleteTaskSchema.parse(await request.json());
  const existingTask = await assertTaskAccess(payload.taskId, userId);

  if (!existingTask) {
    return NextResponse.json(
      { error: "Task not found or access denied" },
      { status: 404 },
    );
  }

  await prisma.task.delete({
    where: {
      id: payload.taskId,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingTask.projectId,
      actorId: userId,
      action: "DELETED",
      summary: `Deleted task "${existingTask.title}"`,
    },
  });

  return NextResponse.json({ ok: true });
}
