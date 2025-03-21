import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    response: null,
  };
}

export async function POST() {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return NextResponse.json({
    notifications: notifications.map(serializeNotification),
    unreadCount: 0,
  });
}
