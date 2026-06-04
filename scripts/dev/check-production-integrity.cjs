const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const email = process.env.SEED_EMAIL;

async function main() {
  if (!email) {
    throw new Error("Set SEED_EMAIL.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  if (!user.accounts.length) {
    throw new Error(`${email} exists but has no OAuth account.`);
  }

  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: {
          userId: user.id,
        },
      },
    },
    include: {
      channels: {
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
          files: true,
          members: true,
        },
      },
    },
  });

  console.log(`Accessible projects for ${email}: ${projects.length}`);

  for (const project of projects) {
    const hasChannel = project.channels.length > 0;
    const messageCount = project.channels.reduce(
      (total, channel) => total + channel._count.messages,
      0,
    );

    console.log({
      project: project.name,
      slug: project.slug,
      tasks: project._count.tasks,
      files: project._count.files,
      members: project._count.members,
      channels: project.channels.length,
      messages: messageCount,
    });

    if (!hasChannel) {
      throw new Error(`${project.name} has no channel.`);
    }
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
