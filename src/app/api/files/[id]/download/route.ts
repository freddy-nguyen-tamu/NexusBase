import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createDownloadUrl, s3Client } from "@/lib/aws/s3";
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
      deletedAt: null,
      project: {
        members: {
          some: { userId: session.user.id },
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
  }

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: file.bucket,
        Key: file.key,
      }),
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "File metadata exists, but the S3 object is missing. Upload the file again.",
      },
      { status: 404 },
    );
  }

  const url = await createDownloadUrl({ key: file.key, expiresIn: 300 });
  return NextResponse.redirect(url);
}
