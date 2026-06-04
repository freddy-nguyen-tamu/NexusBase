import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createDownloadUrl } from "@/lib/aws/s3";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.fileObject.findFirst({
    where: {
      id,
      project: {
        members: {
          some: { userId: session.user.id },
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await createDownloadUrl({ key: file.key, expiresIn: 300 });
  return NextResponse.redirect(url);
}
