const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const email = process.env.SEED_EMAIL;

async function main() {
  if (!email) {
    throw new Error("Set SEED_EMAIL before running this script.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (!user) {
    throw new Error(`No user found for ${email}. Sign in first.`);
  }

  if (!user.accounts.length) {
    throw new Error(
      `User ${email} has no linked OAuth account. Do not attach data to a fake seeded auth user.`,
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "ADMIN",
      disabledAt: null,
    },
  });

  const projects = await prisma.project.findMany();

  for (const project of projects) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        ownerId: user.id,
      },
    });

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: user.id,
        },
      },
      update: {
        role: "OWNER",
      },
      create: {
        projectId: project.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  }

  console.log(`Attached ${projects.length} projects to ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
