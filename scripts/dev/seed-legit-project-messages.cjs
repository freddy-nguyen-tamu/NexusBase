const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_EMAIL || "qacer6973@gmail.com";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const projectMessages = {
  "NexusBase Launch Workspace": [
    "I reviewed the production launch checklist. Auth, dashboard counts, project access, and file metadata are all connected to the database.",
    "The next priority is making sure S3 downloads only show as available when the object actually exists in the bucket.",
    "The activity timeline is now useful for the demo because it tracks task updates, file events, comments, and workspace changes.",
    "Before showing this in a portfolio walkthrough, we should test sign-in, project switching, task movement, file upload, and chat refresh.",
    "I cleaned up the placeholder issue by making the workspace rely on real Prisma records instead of static UI content.",
  ],
  "Customer Portal Redesign": [
    "The onboarding flow needs clearer empty states for new accounts, especially before the user creates their first workspace.",
    "I added notes for account settings, billing visibility, and support handoff so this project has a realistic product scope.",
    "The redesign should prioritize reducing the number of clicks between sign-in and the first useful dashboard action.",
    "We should reuse the same card, button, and toggle styles from the dashboard to keep the portal consistent.",
    "The next design pass should focus on mobile navigation and responsive tables.",
  ],
  "Secure File Sharing": [
    "The upload flow should only save file metadata after the S3 upload succeeds.",
    "Download links should be short-lived and generated on demand instead of exposing raw S3 object URLs.",
    "Editors can upload and rename files, but viewers should stay read-only.",
    "We should add a clear error when file metadata exists but the matching S3 object is missing.",
    "The audit log should record uploads, downloads, shares, renames, and deletes.",
  ],
  "Admin Analytics Suite": [
    "The admin overview should summarize active users, project growth, completed tasks, file volume, and recent activity.",
    "Permission analytics would make the demo stronger by showing owners, editors, viewers, and disabled users.",
    "Task throughput should be grouped by project so the admin view explains where work is moving fastest.",
    "File analytics should distinguish metadata rows from real uploaded S3 objects.",
    "The final dashboard should avoid fake summary cards and calculate everything from PostgreSQL.",
  ],
};

const fallbackMessages = [
  "I reviewed this workspace and confirmed the core project data is loading from PostgreSQL.",
  "The task board, member list, files table, activity timeline, and chat should all stay connected to real records.",
  "The next step is polishing the UI states so empty, loading, and error screens feel intentional.",
  "This project is ready for a realistic demo pass once permissions and file actions are verified.",
  "I added this message through the same project channel structure the app expects.",
];

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { accounts: true },
  });

  if (!owner) {
    throw new Error(`No user found for ${EMAIL}. Sign in first.`);
  }

  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: {
          userId: owner.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (projects.length === 0) {
    throw new Error("No accessible projects found for the signed-in user.");
  }

  let created = 0;
  let updated = 0;

  for (const project of projects) {
    const canonicalSlug = slugify(project.slug || project.name);

    const channel = await prisma.channel.upsert({
      where: {
        projectId_slug: {
          projectId: project.id,
          slug: canonicalSlug,
        },
      },
      update: {
        name: `${project.name} Updates`,
        createdById: owner.id,
      },
      create: {
        projectId: project.id,
        createdById: owner.id,
        name: `${project.name} Updates`,
        slug: canonicalSlug,
      },
    });

    const authors =
      project.members.length > 0
        ? project.members.map((member) => member.user)
        : [owner];

    const messages = projectMessages[project.name] ?? fallbackMessages;

    for (let i = 0; i < messages.length; i++) {
      const author = authors[i % authors.length];

      const existing = await prisma.message.findFirst({
        where: {
          channelId: channel.id,
          body: messages[i],
        },
      });

      if (existing) {
        await prisma.message.update({
          where: { id: existing.id },
          data: {
            authorId: author.id,
            readByIds: [owner.id],
          },
        });
        updated += 1;
      } else {
        await prisma.message.create({
          data: {
            channelId: channel.id,
            authorId: author.id,
            body: messages[i],
            readByIds: [owner.id],
          },
        });
        created += 1;
      }
    }

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        actorId: owner.id,
        action: "COMMENTED",
        summary: `Seeded realistic team chat messages in #${canonicalSlug}`,
        metadata: {
          seed: true,
          legitimateMessageSeed: true,
        },
      },
    });

    console.log(`Seeded ${messages.length} messages for ${project.name} in #${canonicalSlug}`);
  }

  console.log("Done.");
  console.table({
    projects: projects.length,
    messagesCreated: created,
    messagesUpdated: updated,
    totalMessages: await prisma.message.count(),
    channels: await prisma.channel.count(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
