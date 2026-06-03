import { ActivityAction, type Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const activityQuerySchema = z.object({
  projectId: z.string().optional(),
  type: z
    .enum([
      "all",
      "project",
      "task",
      "file",
      "comment",
      "message",
      "member",
      "admin",
    ])
    .default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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

function textContains(value: string) {
  return {
    contains: value,
    mode: "insensitive" as const,
  };
}

function getActionFilter(
  type: z.infer<typeof activityQuerySchema>["type"],
): Prisma.ActivityLogWhereInput | undefined {
  if (type === "all") {
    return undefined;
  }

  if (type === "project") {
    return {
      projectId: {
        not: null,
      },
      taskId: null,
      fileId: null,
      action: {
        in: [ActivityAction.CREATED, ActivityAction.UPDATED],
      },
    };
  }

  if (type === "task") {
    return {
      taskId: {
        not: null,
      },
    };
  }

  if (type === "file") {
    return {
      OR: [
        {
          fileId: {
            not: null,
          },
        },
        {
          action: {
            in: [ActivityAction.UPLOADED, ActivityAction.SHARED],
          },
        },
      ],
    };
  }

  if (type === "comment") {
    return {
      OR: [
        {
          action: ActivityAction.COMMENTED,
        },
        {
          summary: textContains("comment"),
        },
      ],
    };
  }

  if (type === "message") {
    return {
      OR: [
        {
          summary: textContains("message"),
        },
        {
          summary: textContains("chat"),
        },
      ],
    };
  }

  if (type === "member") {
    return {
      OR: [
        {
          action: ActivityAction.SHARED,
        },
        {
          summary: textContains("member"),
        },
        {
          summary: textContains("invite"),
        },
        {
          summary: textContains("removed"),
        },
      ],
    };
  }

  if (type === "admin") {
    return {
      OR: [
        {
          summary: textContains("admin"),
        },
        {
          summary: textContains("user"),
        },
      ],
    };
  }

  return undefined;
}

export async function GET(request: Request) {
  try {
    const { userId, response } = await requireUser();

    if (!userId) {
      return response || NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const parsed = activityQuerySchema.safeParse({
      projectId: searchParams.get("projectId") || undefined,
      type: searchParams.get("type") || "all",
      limit: searchParams.get("limit") || "50",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    if (parsed.data.projectId) {
      const membership = await prisma.projectMember.findFirst({
        where: {
          projectId: parsed.data.projectId,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 },
        );
      }
    }

    const actionFilter = getActionFilter(parsed.data.type);
    const accessFilter: Prisma.ActivityLogWhereInput = parsed.data.projectId
      ? {
          projectId: parsed.data.projectId,
        }
      : {
          OR: [
            {
              project: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            },
            {
              actorId: userId,
            },
          ],
        };

    const activity = await prisma.activityLog.findMany({
      where: {
        AND: [accessFilter, ...(actionFilter ? [actionFilter] : [])],
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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
            status: true,
            priority: true,
          },
        },
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: parsed.data.limit,
    });

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      activity: activity.map((item) => ({
        ...item,
        file: item.file
          ? {
              id: item.file.id,
              name: item.file.name,
              mimeType: item.file.mimeType,
              size: Number(item.file.sizeBytes),
            }
          : null,
      })),
      projects,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
