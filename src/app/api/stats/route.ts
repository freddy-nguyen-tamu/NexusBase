import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = session.user.id;

  const projectIds = (
    await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    })
  ).map((pm) => pm.projectId);

  const memberIds = (
    await prisma.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      select: { userId: true },
    })
  ).map((pm) => pm.userId);

  const [projects, tasks, files] = await Promise.all([
    prisma.project.count({ where: { id: { in: projectIds } } }),
    prisma.task.count({ where: { projectId: { in: projectIds } } }),
    prisma.fileObject.count({ where: { projectId: { in: projectIds } } }),
  ]);

  return NextResponse.json({
    projects,
    tasks,
    members: new Set(memberIds).size,
    files,
  });
}
