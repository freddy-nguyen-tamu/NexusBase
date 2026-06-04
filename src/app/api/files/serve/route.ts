import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LOCAL_UPLOAD_DIR = "/tmp/uploads";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const file = await prisma.fileObject.findFirst({
    where: {
      id: fileId,
      bucket: "local",
      project: {
        members: { some: { userId: session.user.id } },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
  }

  const filePath = join(LOCAL_UPLOAD_DIR, file.key);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File data not found on disk" }, { status: 404 });
  }

  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
