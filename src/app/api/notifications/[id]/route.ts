import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { read } = (await req.json()) as { read: boolean };

  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!notif) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });

  return NextResponse.json({ notification });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!notif) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
