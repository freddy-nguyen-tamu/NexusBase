const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const EMAIL = process.env.SEED_EMAIL || "qacer6973@gmail.com";

const roadmapByProject = {
  "NexusBase Launch Workspace": {
    milestones: [
      ["Production authentication ready", "Google OAuth, session persistence, and protected route behavior are stable.", "COMPLETED"],
      ["Database-backed dashboard complete", "Projects, tasks, members, files, activity, and chat all load from PostgreSQL.", "ACTIVE"],
      ["Portfolio demo polish", "Clean up empty states, seeded data quality, and final UI consistency.", "PLANNED"],
    ],
    decisions: [
      ["Use Prisma as the single source of truth", "All dashboard panels should read from PostgreSQL instead of local placeholder arrays.", "APPROVED"],
      ["Use S3 presigned URLs for uploads", "Browser uploads should go directly to S3 while metadata is tracked in PostgreSQL.", "APPROVED"],
    ],
  },
  "Secure File Sharing": {
    milestones: [
      ["Private upload pipeline", "Create presigned upload URLs and verify metadata after upload completion.", "ACTIVE"],
      ["Download validation", "Check that S3 objects exist before returning download links.", "PLANNED"],
    ],
    decisions: [
      ["Keep buckets private", "Files should not be public; all access should use short-lived signed URLs.", "APPROVED"],
    ],
  },
  "Admin Analytics Suite": {
    milestones: [
      ["Workspace health dashboard", "Show user, project, task, file, notification, and activity metrics.", "ACTIVE"],
      ["Permission audit view", "Make it easy to review owners, editors, viewers, and disabled users.", "PLANNED"],
    ],
    decisions: [
      ["Calculate analytics live", "Admin analytics should be derived from real database counts instead of seeded summary values.", "APPROVED"],
    ],
  },
};

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`No user found for ${EMAIL}`);

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
  });

  let milestonesCreated = 0;
  let decisionsCreated = 0;

  for (const project of projects) {
    const seed = roadmapByProject[project.name] || {
      milestones: [
        ["Project planning complete", "Define scope, owners, and implementation order for this workspace.", "ACTIVE"],
        ["Implementation review", "Verify project features and polish user-facing states.", "PLANNED"],
      ],
      decisions: [
        ["Track decisions in NexusBase", "Important project choices should be recorded beside tasks and files.", "APPROVED"],
      ],
    };

    for (let i = 0; i < seed.milestones.length; i++) {
      const [title, description, status] = seed.milestones[i];

      const existing = await prisma.milestone.findFirst({
        where: { projectId: project.id, title },
      });

      const data = {
        projectId: project.id,
        creatorId: user.id,
        ownerId: user.id,
        title,
        description,
        status,
        dueDate: new Date(Date.now() + (i + 7) * 86400000),
        sortOrder: i + 1,
        startedAt: status === "ACTIVE" ? new Date() : null,
        completedAt: status === "COMPLETED" ? new Date() : null,
      };

      if (existing) {
        await prisma.milestone.update({ where: { id: existing.id }, data });
      } else {
        await prisma.milestone.create({ data });
        milestonesCreated++;
      }
    }

    for (const [title, decisionText, status] of seed.decisions) {
      const existing = await prisma.decision.findFirst({
        where: { projectId: project.id, title },
      });

      const data = {
        projectId: project.id,
        creatorId: user.id,
        title,
        context: `Decision for ${project.name}`,
        decision: decisionText,
        impact: "Improves consistency, maintainability, and portfolio demo quality.",
        status,
      };

      if (existing) {
        await prisma.decision.update({ where: { id: existing.id }, data });
      } else {
        await prisma.decision.create({ data });
        decisionsCreated++;
      }
    }
  }

  console.log(`Projects: ${projects.length}`);
  console.log(`Milestones created: ${milestonesCreated}`);
  console.log(`Decisions created: ${decisionsCreated}`);
  console.log(`Total milestones: ${await prisma.milestone.count()}`);
  console.log(`Total decisions: ${await prisma.decision.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
