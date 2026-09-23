import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { SECURE_MODE_COOKIE, verifySecureModeToken } from "@/lib/secureMode";
import { isValidRedactions } from "@/lib/redaction";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const isOwner = document.clientId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!isAdmin && isValidRedactions(document.redactions) && document.redactions.length > 0) {
    const token = req.cookies.get(SECURE_MODE_COOKIE)?.value;
    if (!verifySecureModeToken(token, session.user.id)) {
      return NextResponse.json(
        { error: "Esta hoja tiene datos protegidos. Activa el modo seguro con tu contraseña para descargarla." },
        { status: 403 }
      );
    }
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60 segundos

  const url = cloudinary.utils.private_download_url(
    document.publicId,
    document.format || "",
    {
      resource_type: document.resourceType,
      type: "private",
      attachment: true,
      expires_at: expiresAt,
    }
  );

  await logAudit({
    action: "DOWNLOAD",
    actorId: session.user.id,
    targetUserId: document.clientId,
    detail: `Descargó hoja: "${document.title}"`,
    ip: getClientIp(req.headers),
    userAgent: getUserAgent(req.headers),
  });

  return NextResponse.redirect(url);
}
