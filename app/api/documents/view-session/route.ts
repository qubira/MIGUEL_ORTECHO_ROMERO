import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";

// Se llama al cerrar el visor (o al ocultar/cerrar la pestaña) para registrar
// cuánto tiempo se quedó viendo el documento y en qué modo. sendBeacon manda
// el cuerpo como texto/blob, por eso se parsea manualmente en vez de usar
// req.json().
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await req.text();
  let body: any = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const kind = body.kind === "book" ? "book" : "single";
  const id = typeof body.id === "string" ? body.id : "";
  const seconds = Math.max(0, Math.min(Math.round(Number(body.seconds) || 0), 24 * 60 * 60));
  const mode = body.mode === "spread" ? "Libro abierto" : "Individual";

  if (!id || seconds < 2) {
    return NextResponse.json({ ok: true });
  }

  let targetUserId: string | null = null;
  let label = "";

  if (kind === "book") {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return NextResponse.json({ ok: true });
    const isOwner = book.clientId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    targetUserId = book.clientId;
    label = `el libro "${book.title}"`;
  } else {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return NextResponse.json({ ok: true });
    const isOwner = document.clientId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    targetUserId = document.clientId;
    label = `la hoja "${document.title}"`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const durationLabel = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;

  await logAudit({
    action: "DOCUMENT_VIEW",
    actorId: session.user.id,
    targetUserId,
    detail: `Estuvo viendo ${label} durante ${durationLabel}, en modo ${mode}`,
    ip: getClientIp(req.headers),
    userAgent: getUserAgent(req.headers),
  });

  return NextResponse.json({ ok: true });
}
