import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import type { AuditAction } from "@prisma/client";

const VALID_ACTIONS: AuditAction[] = [
  "LOGIN",
  "PASSWORD_CHANGE",
  "NAME_CHANGE",
  "DOWNLOAD",
  "SECURE_MODE_UNLOCK",
];

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  const actionParam = req.nextUrl.searchParams.get("action") || undefined;
  const action =
    actionParam && VALID_ACTIONS.includes(actionParam as AuditAction)
      ? (actionParam as AuditAction)
      : undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { OR: [{ actorId: userId }, { targetUserId: userId }] } : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      actor: { select: { id: true, name: true, username: true, role: true } },
      targetUser: { select: { id: true, name: true, username: true } },
    },
  });

  return NextResponse.json({ logs });
}
