import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION ?? "us-east-1";

export const s3Client = new S3Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export function getBucketName() {
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is required before using NexusBase file storage.");
  }

  return process.env.AWS_S3_BUCKET;
}

export function buildWorkspaceFileKey({
  workspaceId,
  userId,
  fileName,
}: {
  workspaceId: string;
  userId: string;
  fileName: string;
}) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  return `workspaces/${workspaceId}/users/${userId}/${crypto.randomUUID()}-${safeFileName}`;
}

export async function createUploadUrl({
  key,
  contentType,
  expiresIn = 300,
}: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

export async function createDownloadUrl({
  key,
  expiresIn = 300,
}: {
  key: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
    { expiresIn },
  );
}
