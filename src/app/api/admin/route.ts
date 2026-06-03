import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userRoleSchema = z.enum(["USER", "ADMIN"]);

const updateUserSchema = z.object({
  userId: z.string().min(1, "User is required"),
  role: userRoleSchema.optional(),
  suspended: z.boolean().optional(),
});

const deleteUserSchema = z.object({
  userId: z.string().min(1, "User is required"),
});

type UserWithCounts = Awaited<ReturnType<typeof getRawUsers>>[number];
type ProjectWithCounts = Awaited<ReturnType<typeof getRawTopProjects>>[number];

async function requireAdmin() {
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

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
      email: true,
      name: true,
      disabledAt: true,
    },
  });

  if (!user || user.disabledAt) {
    return {
      userId: null,
      response: NextResponse.json(
        { error: "Account disabled or not found" },
        { status: 403 },
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      userId: null,
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      ),
    };
  }

  return {
    userId: user.id,
    response: null,
  };
}

function serializeUser(user: UserWithCounts) {
  return {
    ...user,
    _count: {
      projectMemberships: user._count.memberships,
      tasksCreated: user._count.createdTasks,
      tasksAssigned: user._count.assignedTasks,
      files: user._count.files,
      comments: user._count.comments,
      messages: user._count.messages,
      notifications: user._count.notifications,
    },
  };
}

function serializeProject(project: ProjectWithCounts) {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    updatedAt: project.updatedAt,
    _count: {
      members: project._count.members,
      tasks: project._count.tasks,
      files: project._count.files,
      comments: project._count.comments,
      messages: project.channels.reduce(
        (total, channel) => total + channel._count.messages,
        0,
      ),
      activityLogs: project._count.activityLogs,
    },
  };
}

async function getRawUsers(take = 100) {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      disabledAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          memberships: true,
          createdTasks: true,
          assignedTasks: true,
          files: true,
          comments: true,
          messages: true,
          notifications: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
}

async function getRawTopProjects() {
  return prisma.project.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      channels: {
        select: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          tasks: true,
          files: true,
          comments: true,
          activityLogs: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 8,
  });
}

async function getActivity(take = 100) {
  return prisma.activityLog.findMany({
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      file: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
}

async function getOverview() {
  const [
    users,
    suspendedUsers,
    projects,
    projectMembers,
    tasks,
    files,
    comments,
    messages,
    notifications,
    unreadNotifications,
    activityLogs,
    recentActivity,
    topProjects,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        disabledAt: {
          not: null,
        },
      },
    }),
    prisma.project.count(),
    prisma.projectMember.count(),
    prisma.task.count(),
    prisma.fileObject.count(),
    prisma.comment.count(),
    prisma.message.count(),
    prisma.notification.count(),
    prisma.notification.count({
      where: {
        readAt: null,
      },
    }),
    prisma.activityLog.count(),
    getActivity(20),
    getRawTopProjects(),
    getRawUsers(8),
  ]);

  return {
    stats: {
      users,
      suspendedUsers,
      activeUsers: users - suspendedUsers,
      projects,
      projectMembers,
      tasks,
      files,
      comments,
      messages,
      notifications,
      unreadNotifications,
      activityLogs,
    },
    recentActivity,
    topProjects: topProjects.map(serializeProject),
    recentUsers: recentUsers.map(serializeUser),
  };
}

async function getUsers() {
  const users = await getRawUsers();
  return users.map(serializeUser);
}

export async function GET(request: Request) {
  try {
    const { userId, response } = await requireAdmin();

    if (!userId) {
      return response || NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") ?? "overview";

    if (view === "users") {
      const users = await getUsers();
      return NextResponse.json({ users });
    }

    if (view === "activity") {
      const activity = await getActivity();
      return NextResponse.json({ activity });
    }

    const overview = await getOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, response } = await requireAdmin();

    if (!userId) {
      return response || NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = updateUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    if (parsed.data.userId === userId && parsed.data.role === "USER") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role" },
        { status: 400 },
      );
    }

    if (parsed.data.userId === userId && parsed.data.suspended === true) {
      return NextResponse.json(
        { error: "You cannot suspend your own account" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: parsed.data.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabledAt: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: {
        id: parsed.data.userId,
      },
      data: {
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(parsed.data.suspended !== undefined
          ? { disabledAt: parsed.data.suspended ? new Date() : null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        disabledAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            memberships: true,
            createdTasks: true,
            assignedTasks: true,
            files: true,
            comments: true,
            messages: true,
            notifications: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: userId,
        action: "UPDATED",
        summary: `Updated user ${existingUser.email ?? existingUser.id}`,
      },
    });

    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, response } = await requireAdmin();

    if (!userId) {
      return response || NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = deleteUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    if (parsed.data.userId === userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: parsed.data.userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: {
        id: parsed.data.userId,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: userId,
        action: "DELETED",
        summary: `Deleted user ${existingUser.email ?? existingUser.id}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
