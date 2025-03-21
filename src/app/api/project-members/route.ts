import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const memberRoleSchema = z.enum(["ADMIN", "EDITOR", "VIEWER"]);

const listMembersSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
});

const addMemberSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  email: z.string().email("A valid user email is required"),
  role: memberRoleSchema.default("VIEWER"),
});

const updateMemberSchema = z.object({
  membershipId: z.string().min(1, "Membership is required"),
  role: memberRoleSchema,
});

const removeMemberSchema = z.object({
  membershipId: z.string().min(1, "Membership is required"),
});

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
    response: null,
  };
}

async function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
    select: {
      id: true,
      role: true,
      projectId: true,
      userId: true,
    },
  });
}

async function getMembershipById(membershipId: string) {
  return prisma.projectMember.findUnique({
    where: {
      id: membershipId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

function canManageMembers(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

function canRemoveTarget(actorRole: string, targetRole: string) {
  if (targetRole === "OWNER") {
    return false;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return targetRole === "EDITOR" || targetRole === "VIEWER";
  }

  return false;
}

function canUpdateTarget(actorRole: string, targetRole: string) {
  if (targetRole === "OWNER") {
    return false;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return targetRole === "EDITOR" || targetRole === "VIEWER";
  }

  return false;
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);

  const parsed = listMembersSchema.safeParse({
    projectId: searchParams.get("projectId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const membership = await getMembership(parsed.data.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  const members = await prisma.projectMember.findMany({
    where: {
      projectId: parsed.data.projectId,
    },
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
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json({
    members,
    currentUserRole: membership.role,
  });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = addMemberSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const actorMembership = await getMembership(parsed.data.projectId, userId);

  if (!actorMembership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  if (!canManageMembers(actorMembership.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can invite project members" },
      { status: 403 },
    );
  }

  const invitedUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  if (!invitedUser) {
    return NextResponse.json(
      {
        error:
          "No user exists with that email yet. Ask them to sign in once, then invite again.",
      },
      { status: 404 },
    );
  }

  const existingMembership = await prisma.projectMember.findFirst({
    where: {
      projectId: parsed.data.projectId,
      userId: invitedUser.id,
    },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "That user is already a member of this project" },
      { status: 409 },
    );
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: parsed.data.projectId,
      userId: invitedUser.id,
      role: parsed.data.role,
    },
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
  });

  await prisma.activityLog.create({
    data: {
      projectId: parsed.data.projectId,
      actorId: userId,
      action: "SHARED",
      summary: `Added ${invitedUser.email} as ${parsed.data.role}`,
    },
  });

  await createNotification({
    userId: invitedUser.id,
    actorId: userId,
    projectId: parsed.data.projectId,
    type: "MEMBER_ADDED",
    title: "Project access granted",
    body: `You were added to a project as ${parsed.data.role}.`,
    href: `/dashboard?projectId=${parsed.data.projectId}`,
  });

  return NextResponse.json({ member }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = updateMemberSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const targetMembership = await getMembershipById(parsed.data.membershipId);

  if (!targetMembership) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 },
    );
  }

  const actorMembership = await getMembership(targetMembership.projectId, userId);

  if (!actorMembership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  if (
    !canManageMembers(actorMembership.role) ||
    !canUpdateTarget(actorMembership.role, targetMembership.role)
  ) {
    return NextResponse.json(
      { error: "You do not have permission to change this member role" },
      { status: 403 },
    );
  }

  const member = await prisma.projectMember.update({
    where: {
      id: parsed.data.membershipId,
    },
    data: {
      role: parsed.data.role,
    },
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
  });

  await prisma.activityLog.create({
    data: {
      projectId: targetMembership.projectId,
      actorId: userId,
      action: "UPDATED",
      summary: `Changed ${targetMembership.user.email} from ${targetMembership.role} to ${parsed.data.role}`,
    },
  });

  return NextResponse.json({ member });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = removeMemberSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const targetMembership = await getMembershipById(parsed.data.membershipId);

  if (!targetMembership) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 },
    );
  }

  const actorMembership = await getMembership(targetMembership.projectId, userId);

  if (!actorMembership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  const isRemovingSelf = targetMembership.userId === userId;

  if (!isRemovingSelf) {
    if (
      !canManageMembers(actorMembership.role) ||
      !canRemoveTarget(actorMembership.role, targetMembership.role)
    ) {
      return NextResponse.json(
        { error: "You do not have permission to remove this member" },
        { status: 403 },
      );
    }
  }

  if (targetMembership.role === "OWNER") {
    return NextResponse.json(
      { error: "Project owners cannot be removed from this screen" },
      { status: 403 },
    );
  }

  await prisma.projectMember.delete({
    where: {
      id: parsed.data.membershipId,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: targetMembership.projectId,
      actorId: userId,
      action: "DELETED",
      summary: `Removed ${targetMembership.user.email} from the project`,
    },
  });

  return NextResponse.json({ ok: true });
}
