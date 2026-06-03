import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { notifyProjectMembers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const DEFAULT_CHAT_SLUG = "team-chat";
const DEFAULT_CHAT_NAME = "Team Chat";

const listMessagesSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  after: z.string().datetime().optional(),
});

const createMessageSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  body: z.string().min(1, "Message cannot be empty").max(2000),
});

const updateMessageSchema = z.object({
  messageId: z.string().min(1, "Message is required"),
  body: z.string().min(1, "Message cannot be empty").max(2000),
});

const deleteMessageSchema = z.object({
  messageId: z.string().min(1, "Message is required"),
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
    response: NextResponse.json({ error: "Internal Server Error" }, { status: 500 }),
  };
}

async function getProjectMembership(projectId: string, userId: string) {
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

async function getDefaultChannel(projectId: string) {
  return prisma.channel.findUnique({
    where: {
      projectId_slug: {
        projectId,
        slug: DEFAULT_CHAT_SLUG,
      },
    },
    select: {
      id: true,
      projectId: true,
    },
  });
}

async function getOrCreateDefaultChannel(projectId: string, userId: string) {
  return prisma.channel.upsert({
    where: {
      projectId_slug: {
        projectId,
        slug: DEFAULT_CHAT_SLUG,
      },
    },
    create: {
      projectId,
      createdById: userId,
      name: DEFAULT_CHAT_NAME,
      slug: DEFAULT_CHAT_SLUG,
    },
    update: {},
    select: {
      id: true,
      projectId: true,
    },
  });
}

async function getMessageForMember(messageId: string, userId: string) {
  return prisma.message.findFirst({
    where: {
      id: messageId,
      channel: {
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    },
    select: {
      id: true,
      body: true,
      authorId: true,
      channel: {
        select: {
          projectId: true,
          project: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

function canModerate(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

type MessageWithAuthor = {
  id: string;
  body: string;
  channelId: string;
  authorId: string;
  readByIds: string[];
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  channel: {
    projectId: string;
  };
};

function serializeMessage(message: MessageWithAuthor) {
  return {
    id: message.id,
    body: message.body,
    projectId: message.channel.projectId,
    authorId: message.authorId,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    author: message.author,
  };
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);

  const parsed = listMessagesSchema.safeParse({
    projectId: searchParams.get("projectId"),
    after: searchParams.get("after") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const membership = await getProjectMembership(parsed.data.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  const channel = await getDefaultChannel(parsed.data.projectId);

  if (!channel) {
    return NextResponse.json({
      messages: [],
      currentUserId: userId,
      currentUserRole: membership.role,
    });
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId: channel.id,
      ...(parsed.data.after
        ? {
            createdAt: {
              gt: new Date(parsed.data.after),
            },
          }
        : {}),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      channel: {
        select: {
          projectId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 100,
  });

  return NextResponse.json({
    messages: messages.map(serializeMessage),
    currentUserId: userId,
    currentUserRole: membership.role,
  });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = createMessageSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const membership = await getProjectMembership(parsed.data.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  const channel = await getOrCreateDefaultChannel(parsed.data.projectId, userId);

  const message = await prisma.message.create({
    data: {
      channelId: channel.id,
      authorId: userId,
      body: parsed.data.body.trim(),
      readByIds: [userId],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      channel: {
        select: {
          projectId: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: parsed.data.projectId,
      actorId: userId,
      action: "CREATED",
      summary: "Sent a team chat message",
    },
  });

  await notifyProjectMembers({
    projectId: parsed.data.projectId,
    actorId: userId,
    type: "MESSAGE_CREATED",
    title: "New team message",
    body: "A new message was posted in team chat.",
    href: `/dashboard?projectId=${parsed.data.projectId}`,
  });

  return NextResponse.json({ message: serializeMessage(message) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = updateMessageSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existingMessage = await getMessageForMember(
    parsed.data.messageId,
    userId,
  );

  if (!existingMessage) {
    return NextResponse.json(
      { error: "Message not found or access denied" },
      { status: 404 },
    );
  }

  if (existingMessage.authorId !== userId) {
    return NextResponse.json(
      { error: "Only the message author can edit this message" },
      { status: 403 },
    );
  }

  const message = await prisma.message.update({
    where: {
      id: parsed.data.messageId,
    },
    data: {
      body: parsed.data.body.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      channel: {
        select: {
          projectId: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingMessage.channel.projectId,
      actorId: userId,
      action: "UPDATED",
      summary: "Edited a team chat message",
    },
  });

  return NextResponse.json({ message: serializeMessage(message) });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const parsed = deleteMessageSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const existingMessage = await getMessageForMember(
    parsed.data.messageId,
    userId,
  );

  if (!existingMessage) {
    return NextResponse.json(
      { error: "Message not found or access denied" },
      { status: 404 },
    );
  }

  const membership = await getProjectMembership(
    existingMessage.channel.projectId,
    userId,
  );

  const isAuthor = existingMessage.authorId === userId;
  const isModerator = membership ? canModerate(membership.role) : false;

  if (!isAuthor && !isModerator) {
    return NextResponse.json(
      { error: "Only the author, owners, or admins can delete this message" },
      { status: 403 },
    );
  }

  await prisma.message.delete({
    where: {
      id: parsed.data.messageId,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingMessage.channel.projectId,
      actorId: userId,
      action: "DELETED",
      summary: "Deleted a team chat message",
    },
  });

  return NextResponse.json({ ok: true });
}
