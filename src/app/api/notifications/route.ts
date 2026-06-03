import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateNotificationSchema = z.object({
  notificationId: z.string().min(1, "Notification is required"),
  read: z.boolean(),
});

const deleteNotificationSchema = z.object({
  notificationId: z.string().min(1, "Notification is required"),
});

type StoredNotification = {
  id: string;
  type: "TASK_ASSIGNED" | "COMMENT_ADDED" | "FILE_SHARED" | "ROLE_CHANGED" | "SYSTEM";
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function toClientType(type: StoredNotification["type"]) {
  const typeMap: Record<
    StoredNotification["type"],
    | "TASK_ASSIGNED"
    | "COMMENT_CREATED"
    | "FILE_SHARED"
    | "MEMBER_ADDED"
    | "SYSTEM"
  > = {
    TASK_ASSIGNED: "TASK_ASSIGNED",
    COMMENT_ADDED: "COMMENT_CREATED",
    FILE_SHARED: "FILE_SHARED",
    ROLE_CHANGED: "MEMBER_ADDED",
    SYSTEM: "SYSTEM",
  };

  return typeMap[type];
}

function serializeNotification(notification: StoredNotification) {
  return {
    id: notification.id,
    type: toClientType(notification.type),
    title: notification.title,
    body: notification.body ?? "",
    href: notification.href,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.createdAt.toISOString(),
    project: null,
    task: null,
    file: null,
  };
}

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

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });

  return NextResponse.json({
    notifications: notifications.map(serializeNotification),
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = updateNotificationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existingNotification = await prisma.notification.findFirst({
    where: {
      id: parsed.data.notificationId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingNotification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 },
    );
  }

  const notification = await prisma.notification.update({
    where: {
      id: parsed.data.notificationId,
    },
    data: {
      readAt: parsed.data.read ? new Date() : null,
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });

  return NextResponse.json({
    notification: serializeNotification(notification),
    unreadCount,
  });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = deleteNotificationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existingNotification = await prisma.notification.findFirst({
    where: {
      id: parsed.data.notificationId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingNotification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 },
    );
  }

  await prisma.notification.delete({
    where: {
      id: parsed.data.notificationId,
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    unreadCount,
  });
}
