import { prisma } from "@/lib/prisma";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "COMMENT_CREATED"
  | "FILE_SHARED"
  | "FILE_UPLOADED"
  | "MEMBER_ADDED"
  | "MESSAGE_CREATED"
  | "PROJECT_UPDATED"
  | "SYSTEM";

type StoredNotificationType =
  | "TASK_ASSIGNED"
  | "COMMENT_ADDED"
  | "FILE_SHARED"
  | "ROLE_CHANGED"
  | "SYSTEM";

type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  fileId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
};

function toStoredType(type: NotificationType): StoredNotificationType {
  const typeMap: Record<NotificationType, StoredNotificationType> = {
    TASK_ASSIGNED: "TASK_ASSIGNED",
    TASK_UPDATED: "TASK_ASSIGNED",
    COMMENT_CREATED: "COMMENT_ADDED",
    FILE_SHARED: "FILE_SHARED",
    FILE_UPLOADED: "FILE_SHARED",
    MEMBER_ADDED: "ROLE_CHANGED",
    MESSAGE_CREATED: "SYSTEM",
    PROJECT_UPDATED: "SYSTEM",
    SYSTEM: "SYSTEM",
  };

  return typeMap[type];
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: toStoredType(input.type),
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });
}

export async function notifyProjectMembers(input: {
  projectId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  taskId?: string | null;
  fileId?: string | null;
}) {
  const members = await prisma.projectMember.findMany({
    where: {
      projectId: input.projectId,
      ...(input.actorId
        ? {
            userId: {
              not: input.actorId,
            },
          }
        : {}),
    },
    select: {
      userId: true,
    },
  });

  if (!members.length) {
    return [];
  }

  return prisma.notification.createMany({
    data: members.map((member) => ({
      userId: member.userId,
      actorId: input.actorId ?? null,
      type: toStoredType(input.type),
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    })),
  });
}

export async function notifyTaskAssignee(input: {
  assigneeId: string | null | undefined;
  actorId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
}) {
  if (!input.assigneeId || input.assigneeId === input.actorId) {
    return null;
  }

  return createNotification({
    userId: input.assigneeId,
    actorId: input.actorId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: "TASK_ASSIGNED",
    title: "New task assigned",
    body: `You were assigned "${input.taskTitle}".`,
    href: `/dashboard?taskId=${input.taskId}`,
  });
}
