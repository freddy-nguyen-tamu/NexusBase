const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const EMAIL = process.env.SEED_EMAIL || "qacer6973@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`No user found for ${EMAIL}`);

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });

  let linked = 0;

  for (const project of projects) {
    if (project.milestones.length === 0) continue;

    for (let i = 0; i < project.tasks.length; i++) {
      const milestone = project.milestones[i % project.milestones.length];

      await prisma.task.update({
        where: { id: project.tasks[i].id },
        data: { milestoneId: milestone.id },
      });

      linked++;
    }
  }

  console.log(`Linked ${linked} tasks to milestones.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
