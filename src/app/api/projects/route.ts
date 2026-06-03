import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z.string().min(2).optional(),
  description: z.string().max(500).nullable().optional(),
});

const deleteProjectSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function buildUniqueSlug(name: string) {
  const baseSlug = slugify(name) || "project";
  let slug = baseSlug;
  let counter = 2;

  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
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

async function getProjectMembership(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
    select: {
      id: true,
      role: true,
    },
  });
}

function canManageProject(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function GET() {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
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
      },
      _count: {
        select: {
          tasks: true,
          files: true,
          activityLogs: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = createProjectSchema.parse(await request.json());
  const slug = await buildUniqueSlug(payload.name);

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name: payload.name,
      slug,
      description: payload.description,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
      activityLogs: {
        create: {
          actorId: userId,
          action: "CREATED",
          summary: `Created project "${payload.name}"`,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
          files: true,
          activityLogs: true,
        },
      },
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = updateProjectSchema.parse(await request.json());
  const membership = await getProjectMembership(payload.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  if (!canManageProject(membership.role)) {
    return NextResponse.json(
      { error: "Only project owners and admins can update this project" },
      { status: 403 },
    );
  }

  const nextSlug = payload.name ? await buildUniqueSlug(payload.name) : undefined;

  const project = await prisma.project.update({
    where: {
      id: payload.projectId,
    },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
      activityLogs: {
        create: {
          actorId: userId,
          action: "UPDATED",
          summary: `Updated project settings`,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
          files: true,
          activityLogs: true,
        },
      },
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = deleteProjectSchema.parse(await request.json());
  const membership = await getProjectMembership(payload.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  if (membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only project owners can delete this project" },
      { status: 403 },
    );
  }

  await prisma.project.delete({
    where: {
      id: payload.projectId,
    },
  });

  return NextResponse.json({ ok: true });
}
