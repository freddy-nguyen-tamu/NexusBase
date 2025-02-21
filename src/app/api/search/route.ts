import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const searchSchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(100),
  projectId: z.string().optional(),
  type: z
    .enum(["all", "projects", "tasks", "files", "comments", "messages"])
    .default("all"),
});

type SearchResult = {
  id: string;
  type: "project" | "task" | "file" | "comment" | "message";
  title: string;
  body: string | null;
  projectId: string;
  projectName: string;
  href: string;
  updatedAt: Date;
  meta: Record<string, string | number | null>;
};

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

function shouldSearch(type: string, target: string) {
  return type === "all" || type === target;
}

function normalizeQuery(value: string) {
  return value.trim();
}

function truncate(value: string | null | undefined, maxLength = 180) {
  if (!value) {
    return null;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);

  const parsed = searchSchema.safeParse({
    q: searchParams.get("q") ?? "",
    projectId: searchParams.get("projectId") || undefined,
    type: searchParams.get("type") || "all",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search request" },
      { status: 400 },
    );
  }

  const query = normalizeQuery(parsed.data.q);
  const projectFilter = parsed.data.projectId
    ? { id: parsed.data.projectId }
    : {};

  const projectAccessWhere = {
    ...projectFilter,
    members: {
      some: {
        userId,
      },
    },
  };

  const results: SearchResult[] = [];

  if (shouldSearch(parsed.data.type, "projects")) {
    const projects = await prisma.project.findMany({
      where: {
        ...projectAccessWhere,
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        updatedAt: true,
        _count: {
          select: {
            tasks: true,
            files: true,
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });

    results.push(
      ...projects.map((project) => ({
        id: project.id,
        type: "project" as const,
        title: project.name,
        body: truncate(project.description),
        projectId: project.id,
        projectName: project.name,
        href: `/dashboard?projectId=${project.id}`,
        updatedAt: project.updatedAt,
        meta: {
          slug: project.slug,
          tasks: project._count.tasks,
          files: project._count.files,
          members: project._count.members,
        },
      })),
    );
  }

  if (shouldSearch(parsed.data.type, "tasks")) {
    const tasks = await prisma.task.findMany({
      where: {
        project: projectAccessWhere,
        OR: [
          {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
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
      take: 15,
    });

    results.push(
      ...tasks.map((task) => ({
        id: task.id,
        type: "task" as const,
        title: task.title,
        body: truncate(task.description),
        projectId: task.project.id,
        projectName: task.project.name,
        href: `/dashboard?taskId=${task.id}`,
        updatedAt: task.updatedAt,
        meta: {
          status: task.status,
          priority: task.priority,
          assignee: task.assignee?.name ?? task.assignee?.email ?? "Unassigned",
        },
      })),
    );
  }

  if (shouldSearch(parsed.data.type, "files")) {
    const files = await prisma.fileObject.findMany({
      where: {
        project: projectAccessWhere,
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            mimeType: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            key: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 15,
    });

    results.push(
      ...files.map((file) => ({
        id: file.id,
        type: "file" as const,
        title: file.name,
        body: truncate(file.mimeType),
        projectId: file.project.id,
        projectName: file.project.name,
        href: `/dashboard?fileId=${file.id}`,
        updatedAt: file.updatedAt,
        meta: {
          size: Number(file.sizeBytes),
          mimeType: file.mimeType,
          uploader: file.owner?.name ?? file.owner?.email ?? "Unknown",
        },
      })),
    );
  }

  if (shouldSearch(parsed.data.type, "comments")) {
    const comments = await prisma.comment.findMany({
      where: {
        project: {
          is: projectAccessWhere,
        },
        body: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 15,
    });

    results.push(
      ...comments
        .filter((comment) => comment.project)
        .map((comment) => ({
          id: comment.id,
          type: "comment" as const,
          title: comment.task
            ? `Comment on ${comment.task.title}`
            : `Comment in ${comment.project?.name ?? "project"}`,
          body: truncate(comment.body),
          projectId: comment.project?.id ?? "",
          projectName: comment.project?.name ?? "Unknown project",
          href: comment.task
            ? `/dashboard?taskId=${comment.task.id}&commentId=${comment.id}`
            : `/dashboard?projectId=${comment.project?.id ?? ""}&commentId=${comment.id}`,
          updatedAt: comment.updatedAt,
          meta: {
            task: comment.task?.title ?? null,
            author: comment.author?.name ?? comment.author?.email ?? "Unknown",
          },
        })),
    );
  }

  if (shouldSearch(parsed.data.type, "messages")) {
    const messages = await prisma.message.findMany({
      where: {
        channel: {
          project: projectAccessWhere,
        },
        body: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        channel: {
          select: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 15,
    });

    results.push(
      ...messages.map((message) => ({
        id: message.id,
        type: "message" as const,
        title: `Message from ${
          message.author?.name ?? message.author?.email ?? "Unknown user"
        }`,
        body: truncate(message.body),
        projectId: message.channel.project.id,
        projectName: message.channel.project.name,
        href: `/dashboard?projectId=${message.channel.project.id}&messageId=${message.id}`,
        updatedAt: message.updatedAt,
        meta: {
          author: message.author?.name ?? message.author?.email ?? "Unknown",
        },
      })),
    );
  }

  const sortedResults = results
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 50)
    .map((result) => ({
      ...result,
      updatedAt: result.updatedAt.toISOString(),
    }));

  return NextResponse.json({
    query,
    count: sortedResults.length,
    results: sortedResults,
  });
}
