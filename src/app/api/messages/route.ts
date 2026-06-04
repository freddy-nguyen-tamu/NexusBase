import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import {
  getOrCreateProjectDefaultChannel,
  getProjectChannelForMember,
} from "@/lib/channels";
import { notifyProjectMembers } from "@/lib/notifications";
import { canModerateProject } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const listMessagesSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  channelId: z.string().optional(),
  after: z.string().datetime().optional(),
});

const createMessageSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  channelId: z.string().optional(),
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
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
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
          id: true,
          projectId: true,
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });
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
    id: string;
    projectId: string;
    name: string;
    slug: string;
  };
};

function serializeMessage(message: MessageWithAuthor) {
  return {
    id: message.id,
    body: message.body,
    channelId: message.channelId,
    projectId: message.channel.projectId,
    authorId: message.authorId,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    author: message.author,
    channel: {
      id: message.channel.id,
      name: message.channel.name,
      slug: message.channel.slug,
    },
  };
}

function serializeChannel(channel: {
  id: string;
  projectId: string;
  name: string;
  slug: string;
}) {
  return {
    id: channel.id,
    projectId: channel.projectId,
    name: channel.name,
    slug: channel.slug,
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
    channelId: searchParams.get("channelId") || undefined,
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

  const channel = await getProjectChannelForMember({
    projectId: parsed.data.projectId,
    channelId: parsed.data.channelId,
    userId,
  });

  if (!channel) {
    return NextResponse.json(
      { error: "Channel not found or access denied" },
      { status: 404 },
    );
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
          id: true,
          projectId: true,
          name: true,
          slug: true,
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
    channel: serializeChannel(channel),
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

  const channel = parsed.data.channelId
    ? await getProjectChannelForMember({
        projectId: parsed.data.projectId,
        channelId: parsed.data.channelId,
        userId,
      })
    : await getOrCreateProjectDefaultChannel({
        projectId: membership.project.id,
        projectName: membership.project.name,
        projectSlug: membership.project.slug,
        userId,
      });

  if (!channel) {
    return NextResponse.json(
      { error: "Channel not found or access denied" },
      { status: 404 },
    );
  }

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
          id: true,
          projectId: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: parsed.data.projectId,
      actorId: userId,
      action: "COMMENTED",
      summary: `Sent a message in #${channel.slug}`,
    },
  });

  await notifyProjectMembers({
    projectId: parsed.data.projectId,
    actorId: userId,
    type: "MESSAGE_CREATED",
    title: "New team message",
    body: `A new message was posted in #${channel.slug}.`,
    href: `/dashboard?projectId=${parsed.data.projectId}`,
  });

  return NextResponse.json(
    {
      message: serializeMessage(message),
      channel: serializeChannel(channel),
    },
    { status: 201 },
  );
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
          id: true,
          projectId: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingMessage.channel.projectId,
      actorId: userId,
      action: "UPDATED",
      summary: `Edited a message in #${message.channel.slug}`,
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
  const isModerator = membership ? canModerateProject(membership.role) : false;

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
