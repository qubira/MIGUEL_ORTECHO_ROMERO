import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInlineViewUrl } from "@/lib/cloudinaryView";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const isOwner = document.clientId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await logAudit({
    action: "DOCUMENT_VIEW",
    actorId: session.user.id,
    targetUserId: document.clientId,
    detail: `${isAdmin ? "Admin visualizó" : "Visualizó"} la hoja: "${document.title}"`,
    ip: getClientIp(req.headers),
    userAgent: getUserAgent(req.headers),
  });

  return NextResponse.json({
    id: document.id,
    title: document.title,
    pageNumber: document.pageNumber,
    url: getInlineViewUrl(document),
    redactions: document.redactions,
  });
}
