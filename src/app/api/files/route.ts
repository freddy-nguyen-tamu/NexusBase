import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { createDownloadUrl, getBucketName, s3Client } from "@/lib/aws/s3";
import { notifyProjectMembers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createFileSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z.string().min(1, "File name is required"),
  key: z.string().min(1, "S3 object key is required"),
  bucket: z.string().min(1, "Bucket is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().int().nonnegative(),
});

const updateFileSchema = z.object({
  fileId: z.string().min(1, "File is required"),
  name: z.string().min(1, "File name is required"),
});

const deleteFileSchema = z.object({
  fileId: z.string().min(1, "File is required"),
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

async function assertProjectMembership(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
    select: {
      id: true,
      role: true,
    },
  });
}

async function getFileForMember(fileId: string, userId: string) {
  return prisma.fileObject.findFirst({
    where: {
      id: fileId,
      project: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

function canManageFile(role: string) {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

type FileWithRelations = NonNullable<
  Awaited<ReturnType<typeof getFileForMember>>
>;

function serializeFile(file: FileWithRelations) {
  return {
    id: file.id,
    name: file.name,
    key: file.key,
    bucket: file.bucket,
    mimeType: file.mimeType,
    size: Number(file.sizeBytes),
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    projectId: file.projectId,
    uploaderId: file.ownerId,
    project: file.project,
    uploader: file.owner,
  };
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const fileId = searchParams.get("fileId");
  const action = searchParams.get("action");

  if (fileId && action === "download") {
    const file = await getFileForMember(fileId, userId);

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 },
      );
    }

    const downloadUrl = await createDownloadUrl({
      key: file.key,
      expiresIn: 300,
    });

    return NextResponse.json({
      downloadUrl,
      expiresInSeconds: 300,
      file: serializeFile(file),
    });
  }

  const files = await prisma.fileObject.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      project: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ files: files.map(serializeFile) });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = createFileSchema.parse(await request.json());
  const membership = await assertProjectMembership(payload.projectId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "You do not have access to this project" },
      { status: 403 },
    );
  }

  if (!canManageFile(membership.role)) {
    return NextResponse.json(
      { error: "Only owners, admins, and editors can upload files" },
      { status: 403 },
    );
  }

  const expectedBucket = getBucketName();

  if (payload.bucket !== expectedBucket) {
    return NextResponse.json(
      { error: "Uploaded file bucket does not match configured bucket" },
      { status: 400 },
    );
  }

  const file = await prisma.fileObject.create({
    data: {
      projectId: payload.projectId,
      ownerId: userId,
      name: payload.name,
      key: payload.key,
      bucket: payload.bucket,
      mimeType: payload.mimeType,
      sizeBytes: BigInt(payload.size),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      owner: {
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
      projectId: payload.projectId,
      fileId: file.id,
      actorId: userId,
      action: "UPLOADED",
      summary: `Uploaded file "${file.name}"`,
    },
  });

  await notifyProjectMembers({
    projectId: payload.projectId,
    actorId: userId,
    fileId: file.id,
    type: "FILE_UPLOADED",
    title: "New file uploaded",
    body: `"${file.name}" was uploaded to the project.`,
    href: `/dashboard?fileId=${file.id}`,
  });

  return NextResponse.json({ file: serializeFile(file) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = updateFileSchema.parse(await request.json());
  const existingFile = await getFileForMember(payload.fileId, userId);

  if (!existingFile) {
    return NextResponse.json(
      { error: "File not found or access denied" },
      { status: 404 },
    );
  }

  const membership = await assertProjectMembership(existingFile.projectId, userId);

  if (!membership || !canManageFile(membership.role)) {
    return NextResponse.json(
      { error: "Only owners, admins, and editors can rename files" },
      { status: 403 },
    );
  }

  const file = await prisma.fileObject.update({
    where: {
      id: payload.fileId,
    },
    data: {
      name: payload.name,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      owner: {
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
      projectId: file.projectId,
      fileId: file.id,
      actorId: userId,
      action: "UPDATED",
      summary: `Renamed file "${existingFile.name}" to "${file.name}"`,
    },
  });

  return NextResponse.json({ file: serializeFile(file) });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();

  if (!userId) {
    return response;
  }

  const payload = deleteFileSchema.parse(await request.json());
  const existingFile = await getFileForMember(payload.fileId, userId);

  if (!existingFile) {
    return NextResponse.json(
      { error: "File not found or access denied" },
      { status: 404 },
    );
  }

  const membership = await assertProjectMembership(existingFile.projectId, userId);

  if (!membership || !canManageFile(membership.role)) {
    return NextResponse.json(
      { error: "Only owners, admins, and editors can delete files" },
      { status: 403 },
    );
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: existingFile.bucket,
      Key: existingFile.key,
    }),
  );

  await prisma.fileObject.delete({
    where: {
      id: payload.fileId,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: existingFile.projectId,
      actorId: userId,
      action: "DELETED",
      summary: `Deleted file "${existingFile.name}"`,
    },
  });

  return NextResponse.json({ ok: true });
}
