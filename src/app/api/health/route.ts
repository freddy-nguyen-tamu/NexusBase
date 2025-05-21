import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "degraded" | "down";

function getRequiredEnvStatus() {
  const requiredVariables = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];

  return requiredVariables.map((name) => ({
    name,
    configured: Boolean(process.env[name]),
  }));
}

export async function GET() {
  const startedAt = Date.now();
  const env = getRequiredEnvStatus();
  const missingEnv = env.filter((item) => !item.configured);

  let database: {
    status: HealthStatus;
    latencyMs: number | null;
    error: string | null;
  } = {
    status: "down",
    latencyMs: null,
    error: null,
  };

  try {
    const dbStartedAt = Date.now();

    await prisma.$queryRaw`SELECT 1`;

    database = {
      status: "ok",
      latencyMs: Date.now() - dbStartedAt,
      error: null,
    };
  } catch (error) {
    database = {
      status: "down",
      latencyMs: null,
      error: error instanceof Error ? error.message : "Database check failed",
    };
  }

  const status: HealthStatus =
    database.status === "down"
      ? "down"
      : missingEnv.length > 0
        ? "degraded"
        : "ok";

  const responseBody = {
    status,
    service: "nexusbase",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    environment: process.env.NODE_ENV ?? "unknown",
    checks: {
      database,
      env: {
        status: missingEnv.length > 0 ? "degraded" : "ok",
        missing: missingEnv.map((item) => item.name),
        variables: env,
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: status === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
