const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_EMAIL || "qacer6973@gmail.com";

const templates = [
  {
    title: "S3 object missing for uploaded file metadata",
    description: "The database can contain file metadata even when a matching object is missing in S3.",
    severity: "HIGH",
    status: "OPEN",
    impact: "Users may see files in the dashboard that cannot be downloaded.",
    mitigation: "Validate S3 object existence before returning download links and only create metadata after upload success.",
  },
  {
    title: "OAuth account mismatch after database reset",
    description: "Reset scripts that delete Account and Session rows can disconnect Google OAuth users from workspace data.",
    severity: "CRITICAL",
    status: "WATCHING",
    impact: "Users can be locked out or see an empty dashboard after signing in.",
    mitigation: "Never delete Auth.js Account or Session rows in production seed scripts. Use repair scripts that validate OAuth links.",
  },
  {
    title: "Chat messages seeded into non-visible channels",
    description: "Messages can exist in the database but not appear if they are attached to a channel the UI does not load.",
    severity: "MEDIUM",
    status: "MITIGATED",
    impact: "The chat panel appears empty even though message rows exist.",
    mitigation: "Create a canonical channel per project and seed messages through the same channel rules as the API.",
  },
  {
    title: "Dashboard count cards need source-of-truth validation",
    description: "Counts should be calculated from database relationships, not cached placeholders or static arrays.",
    severity: "MEDIUM",
    status: "OPEN",
    impact: "The overview may show totals that disagree with project panels.",
    mitigation: "Centralize dashboard summary queries and verify counts against project memberships.",
  },
  {
    title: "Mobile table density for files and activity",
    description: "Large file and activity tables can become hard to scan on narrow screens.",
    severity: "LOW",
    status: "WATCHING",
    impact: "Mobile users may need excessive scrolling to inspect project history.",
    mitigation: "Add compact cards for mobile breakpoints while keeping the desktop table layout.",
  },
];

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { accounts: true },
  });

  if (!user) {
    throw new Error(`No user found for ${EMAIL}. Sign in first.`);
  }

  if (!user.accounts.length) {
    throw new Error(`${EMAIL} exists but has no OAuth account. Refusing to seed against a fake user.`);
  }

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { members: { include: { user: true } } },
  });

  if (!projects.length) {
    throw new Error("No accessible projects found.");
  }

  let created = 0;
  let updated = 0;

  for (const project of projects) {
    const ownerCandidates = project.members.map((m) => m.user);

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const owner = ownerCandidates[i % ownerCandidates.length] ?? user;

      const existing = await prisma.projectRisk.findFirst({
        where: { projectId: project.id, title: template.title },
      });

      const data = {
        projectId: project.id,
        ownerId: owner.id,
        createdById: user.id,
        title: template.title,
        description: template.description,
        severity: template.severity,
        status: template.status,
        impact: template.impact,
        mitigation: template.mitigation,
        dueDate: new Date(Date.now() + (i + 3) * 86400000),
        resolvedAt: template.status === "CLOSED" || template.status === "MITIGATED" ? new Date() : null,
      };

      if (existing) {
        await prisma.projectRisk.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.projectRisk.create({ data });
        created += 1;
      }
    }

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        actorId: user.id,
        action: "CREATED",
        summary: `Seeded realistic risk register entries for ${project.name}`,
        metadata: { seed: true, feature: "project-health" },
      },
    });
  }

  console.log("Risk seed complete.");
  console.table({
    projects: projects.length,
    risksCreated: created,
    risksUpdated: updated,
    totalRisks: await prisma.projectRisk.count(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
