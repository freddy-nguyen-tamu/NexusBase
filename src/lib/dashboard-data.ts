import { TaskPriority, TaskStatus } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WorkspaceTaskStatus = "todo" | "inProgress" | "done";

export type WorkspaceTask = {
  id: string;
  title: string;
  description: string;
  project: string;
  assignee: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: WorkspaceTaskStatus;
  tags: string[];
};

type DashboardStat = {
  label: string;
  value: string;
  trend?: string;
  detail: string;
};

type DashboardFile = {
  name: string;
  project: string;
  owner: string;
  size: string;
  permission: string;
  updated: string;
  type: string;
};

type DashboardMember = {
  name: string;
  role: string;
  status: string;
  workload: number;
};

type DashboardNotification = {
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

type DashboardActivity = {
  actor: string;
  action: string;
  subject: string;
  scope: string;
  time: string;
};

type DashboardMessage = {
  author: string;
  body: string;
  time: string;
};

export type DashboardSnapshot = {
  workspaceStats: DashboardStat[];
  tasks: WorkspaceTask[];
  files: DashboardFile[];
  members: DashboardMember[];
  notifications: DashboardNotification[];
  activity: DashboardActivity[];
  messages: DashboardMessage[];
  recordCount: number;
};

const emptyDashboard: DashboardSnapshot = {
  workspaceStats: [
    { label: "Active projects", value: "0", detail: "Create your first project" },
    { label: "Open tasks", value: "0", detail: "No open tasks yet" },
    { label: "Files stored", value: "0 B", detail: "Upload files to get started" },
    { label: "Unread updates", value: "0", detail: "You are all caught up" },
  ],
  tasks: [],
  files: [],
  members: [],
  notifications: [],
  activity: [],
  messages: [],
  recordCount: 0,
};

const taskStatusMap: Record<TaskStatus, WorkspaceTask["status"]> = {
  TODO: "todo",
  IN_PROGRESS: "inProgress",
  DONE: "done",
};

const taskPriorityMap: Record<TaskPriority, WorkspaceTask["priority"]> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

function getPersonName(person: { name: string | null; email: string | null }) {
  return person.name ?? person.email ?? "Unknown user";
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatRelativeTime(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) {
    return "Yesterday";
  }

  return `${diffDays} days ago`;
}

function getFileType(mimeType: string) {
  if (mimeType.includes("pdf")) {
    return "PDF";
  }

  if (mimeType.startsWith("image/")) {
    return "Image";
  }

  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return "Sheet";
  }

  if (mimeType.includes("json") || mimeType.includes("javascript")) {
    return "Code";
  }

  return "File";
}

function formatAction(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return emptyDashboard;
  }

  const accessibleProjectWhere = {
    members: {
      some: {
        userId,
      },
    },
  };

  const [
    globalProjectCount,
    projectCount,
    projectMemberCount,
    openTaskCount,
    assignedTaskCount,
    fileStorage,
    unreadNotificationCount,
    tasks,
    files,
    memberships,
    notifications,
    activityLogs,
    messages,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({
      where: accessibleProjectWhere,
    }),
    prisma.projectMember.count({
      where: {
        project: accessibleProjectWhere,
      },
    }),
    prisma.task.count({
      where: {
        project: accessibleProjectWhere,
        status: {
          not: TaskStatus.DONE,
        },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        project: accessibleProjectWhere,
        status: {
          not: TaskStatus.DONE,
        },
      },
    }),
    prisma.fileObject.aggregate({
      where: {
        project: accessibleProjectWhere,
        deletedAt: null,
      },
      _sum: {
        sizeBytes: true,
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
    prisma.task.findMany({
      where: {
        project: accessibleProjectWhere,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        assignee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 9,
    }),
    prisma.fileObject.findMany({
      where: {
        project: accessibleProjectWhere,
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shares: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    }),
    prisma.projectMember.findMany({
      where: {
        project: accessibleProjectWhere,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 6,
    }),
    prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: {
        OR: [
          {
            project: accessibleProjectWhere,
          },
          {
            actorId: userId,
          },
        ],
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.message.findMany({
      where: {
        channel: {
          project: accessibleProjectWhere,
        },
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
  ]);

  if (globalProjectCount === 0) {
    return emptyDashboard;
  }

  const workloadByUser = new Map(
    await Promise.all(
      Array.from(new Set(memberships.map((member) => member.userId))).map(
        async (memberUserId) => {
          const workload = await prisma.task.count({
            where: {
              assigneeId: memberUserId,
              project: accessibleProjectWhere,
              status: {
                not: TaskStatus.DONE,
              },
            },
          });

          return [memberUserId, workload] as const;
        },
      ),
    ),
  );

  const dashboardTasks: WorkspaceTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "No description provided.",
    project: task.project.name,
    assignee: task.assignee ? getPersonName(task.assignee) : "Unassigned",
    dueDate: formatDate(task.dueDate),
    priority: taskPriorityMap[task.priority],
    status: taskStatusMap[task.status],
    tags: task.tags,
  }));

  const dashboardFiles: DashboardFile[] = files.map((file) => ({
    name: file.name,
    project: file.project.name,
    owner: getPersonName(file.owner),
    size: formatBytes(Number(file.sizeBytes)),
    permission:
      file.owner.id === userId
        ? "Owner"
        : file.shares.length > 0
          ? "Shared"
          : "Member",
    updated: formatRelativeTime(file.updatedAt),
    type: getFileType(file.mimeType),
  }));

  const dashboardMembers: DashboardMember[] = memberships.map((member) => ({
    name: getPersonName(member.user),
    role: member.role,
    status: "Active",
    workload: workloadByUser.get(member.userId) ?? 0,
  }));

  const dashboardNotifications: DashboardNotification[] = notifications.map(
    (notification) => ({
      title: notification.title,
      body: notification.body ?? "No notification details provided.",
      time: formatRelativeTime(notification.createdAt),
      unread: !notification.readAt,
    }),
  );

  const dashboardActivity: DashboardActivity[] = activityLogs.map((event) => ({
    actor: event.actor ? getPersonName(event.actor) : "System",
    action: formatAction(event.action),
    subject: event.summary,
    scope: event.project?.name ?? "Workspace",
    time: formatRelativeTime(event.createdAt),
  }));

  const dashboardMessages: DashboardMessage[] = messages.map((message) => ({
    author: getPersonName(message.author),
    body: message.body,
    time: formatTime(message.createdAt),
  }));

  const totalFileBytes = Number(fileStorage._sum.sizeBytes ?? BigInt(0));
  const recordCount =
    projectCount +
    openTaskCount +
    files.length +
    notifications.length +
    activityLogs.length +
    messages.length;

  return {
    workspaceStats: [
      {
        label: "Active projects",
        value: projectCount.toLocaleString(),
        detail: `${projectMemberCount.toLocaleString()} memberships`,
      },
      {
        label: "Open tasks",
        value: openTaskCount.toLocaleString(),
        detail: `${assignedTaskCount.toLocaleString()} assigned to you`,
      },
      {
        label: "Files stored",
        value: formatBytes(totalFileBytes),
        detail: "AWS S3 workspace bucket",
      },
      {
        label: "Unread updates",
        value: unreadNotificationCount.toLocaleString(),
        detail: "Notifications pending",
      },
    ],
    tasks: dashboardTasks,
    files: dashboardFiles,
    members: dashboardMembers,
    notifications: dashboardNotifications,
    activity: dashboardActivity,
    messages: dashboardMessages,
    recordCount,
  };
}
