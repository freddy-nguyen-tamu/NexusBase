const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      channels: true,
    },
  });

  for (const project of projects) {
    const existingProjectSlugChannel = project.channels.find(
      (channel) => channel.slug === project.slug,
    );

    if (existingProjectSlugChannel) {
      continue;
    }

    const firstChannel = project.channels[0];

    if (firstChannel) {
      await prisma.channel.update({
        where: { id: firstChannel.id },
        data: {
          name: `${project.name} Updates`,
          slug: project.slug,
        },
      });

      console.log(`Renamed first channel for ${project.name} to ${project.slug}`);
      continue;
    }

    await prisma.channel.create({
      data: {
        projectId: project.id,
        createdById: project.ownerId,
        name: `${project.name} Updates`,
        slug: slugify(project.slug || project.name),
      },
    });

    console.log(`Created default channel for ${project.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
