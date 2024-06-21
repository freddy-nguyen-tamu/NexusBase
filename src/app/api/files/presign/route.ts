import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import {
  buildWorkspaceFileKey,
  createUploadUrl,
  getBucketName,
} from "@/lib/aws/s3";

const uploadRequestSchema = z.object({
  projectId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = uploadRequestSchema.parse(await request.json());
  const key = buildWorkspaceFileKey({
    workspaceId: payload.projectId,
    userId: session.user.id,
    fileName: payload.fileName,
  });

  const uploadUrl = await createUploadUrl({
    key,
    contentType: payload.contentType,
  });

  return NextResponse.json({
    bucket: getBucketName(),
    key,
    method: "PUT",
    uploadUrl,
    expiresInSeconds: 300,
  });
}
