import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { notifyProjectMembers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const listCommentsSchema = z.object({
  taskId: z.string().min(1, "Task is required"),
});

const createCommentSchema = z.object({
  taskId: z.string().min(1, "Task is required"),
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

const updateCommentSchema = z.object({
  commentId: z.string().min(1, "Comment is required"),
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

const deleteCommentSchema = z.object({
  commentId: z.string().min(1, "Comment is required"),
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

async function getTaskForMember(taskId: string, userId: string) {
  return prisma.task.findFirst({
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
    },
  });
}

async function getCommentForMember(commentId: string, userId: string) {
  return prisma.comment.findFirst({
    where: {
      id: commentId,
      task: {
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    },
    select: {
      id: true,
      body: true,
      authorId: true,
      taskId: true,
      task: {
        select: {
          title: true,
          projectId: true,
        },
      },
    },
  });
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);

  const parsed = listCommentsSchema.safeParse({
    taskId: searchParams.get("taskId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const task = await getTaskForMember(parsed.data.taskId, userId);

  if (!task) {
    return NextResponse.json(
      { error: "Task not found or access denied" },
      { status: 404 },
    );
  }

  const comments = await prisma.comment.findMany({
    where: {
      taskId: parsed.data.taskId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = createCommentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const task = await getTaskForMember(parsed.data.taskId, userId);

  if (!task) {
    return NextResponse.json(
      { error: "Task not found or access denied" },
      { status: 404 },
    );
  }

  const comment = await prisma.comment.create({
    data: {
      taskId: task.id,
      projectId: task.projectId,
      authorId: userId,
      body: parsed.data.body.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      taskId: task.id,
      actorId: userId,
      action: "COMMENTED",
      summary: `Commented on task "${task.title}"`,
    },
  });

  await notifyProjectMembers({
    projectId: task.projectId,
    actorId: userId,
    taskId: task.id,
    type: "COMMENT_CREATED",
    title: "New task comment",
    body: `A new comment was added to "${task.title}".`,
    href: `/dashboard?taskId=${task.id}`,
  });

  return NextResponse.json({ comment }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = updateCommentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existingComment = await getCommentForMember(
    parsed.data.commentId,
    userId,
  );

  if (!existingComment || !existingComment.task || !existingComment.taskId) {
    return NextResponse.json(
      { error: "Comment not found or access denied" },
      { status: 404 },
    );
  }

  if (existingComment.authorId !== userId) {
    return NextResponse.json(
      { error: "Only the comment author can edit this comment" },
      { status: 403 },
    );
  }

  const comment = await prisma.comment.update({
    where: {
      id: parsed.data.commentId,
    },
    data: {
      body: parsed.data.body.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingComment.task.projectId,
      taskId: existingComment.taskId,
      actorId: userId,
      action: "UPDATED",
      summary: `Edited a comment on task "${existingComment.task.title}"`,
    },
  });

  return NextResponse.json({ comment });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = deleteCommentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existingComment = await getCommentForMember(
    parsed.data.commentId,
    userId,
  );

  if (!existingComment || !existingComment.task || !existingComment.taskId) {
    return NextResponse.json(
      { error: "Comment not found or access denied" },
      { status: 404 },
    );
  }

  if (existingComment.authorId !== userId) {
    return NextResponse.json(
      { error: "Only the comment author can delete this comment" },
      { status: 403 },
    );
  }

  await prisma.comment.delete({
    where: {
      id: parsed.data.commentId,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingComment.task.projectId,
      taskId: existingComment.taskId,
      actorId: userId,
      action: "DELETED",
      summary: `Deleted a comment from task "${existingComment.task.title}"`,
    },
  });

  return NextResponse.json({ ok: true });
}
