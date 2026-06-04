import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "File and projectId are required" }, { status: 400 });
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId: session.user.id },
    select: { id: true, role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const ext = file.name.split(".").pop() || "";
  const safeName = `${randomUUID()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", projectId);
  const filePath = join(uploadDir, safeName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const relativePath = `/uploads/${projectId}/${safeName}`;

  const record = await prisma.fileObject.create({
    data: {
      projectId,
      ownerId: session.user.id,
      provider: "LOCAL" as any,
      bucket: "local",
      key: relativePath,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: BigInt(file.size),
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      owner: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId,
      fileId: record.id,
      actorId: session.user.id,
      action: "UPLOADED",
      summary: `Uploaded file "${record.name}"`,
    },
  });

  return NextResponse.json({
    file: {
      id: record.id,
      name: record.name,
      key: record.key,
      bucket: record.bucket,
      mimeType: record.mimeType,
      size: Number(record.sizeBytes),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      projectId: record.projectId,
      uploaderId: record.ownerId,
      project: record.project,
      uploader: record.owner,
    },
  }, { status: 201 });
}
