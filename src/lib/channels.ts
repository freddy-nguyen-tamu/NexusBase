import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function buildUniqueChannelSlug(projectId: string, baseValue: string) {
  const baseSlug = slugify(baseValue) || "general";
  let slug = baseSlug;
  let counter = 2;

  while (
    await prisma.channel.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
      select: {
        id: true,
      },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export type ProjectChannel = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getOrCreateProjectDefaultChannel(input: {
  projectId: string;
  projectName: string;
  projectSlug: string;
  userId: string;
}): Promise<ProjectChannel> {
  const existingProjectSlugChannel = await prisma.channel.findUnique({
    where: {
      projectId_slug: {
        projectId: input.projectId,
        slug: input.projectSlug,
      },
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existingProjectSlugChannel) {
    return existingProjectSlugChannel;
  }

  const existingAnyChannel = await prisma.channel.findFirst({
    where: {
      projectId: input.projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existingAnyChannel) {
    return existingAnyChannel;
  }

  const slug = await buildUniqueChannelSlug(input.projectId, input.projectSlug);

  return prisma.channel.create({
    data: {
      projectId: input.projectId,
      createdById: input.userId,
      name: `${input.projectName} Updates`,
      slug,
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getProjectChannelForMember(input: {
  channelId?: string | null;
  projectId: string;
  userId: string;
}) {
  if (!input.channelId) {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!project) {
      return null;
    }

    return getOrCreateProjectDefaultChannel({
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      userId: input.userId,
    });
  }

  return prisma.channel.findFirst({
    where: {
      id: input.channelId,
      projectId: input.projectId,
      project: {
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
