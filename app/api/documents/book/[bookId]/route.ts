import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInlineViewUrl } from "@/lib/cloudinaryView";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { documents: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book) {
    return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
  }

  const isOwner = book.clientId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pages = book.documents.map((doc) => ({
    id: doc.id,
    pageNumber: doc.pageNumber,
    title: doc.title,
    url: getInlineViewUrl(doc),
    redactions: doc.redactions,
  }));

  await logAudit({
    action: "DOCUMENT_VIEW",
    actorId: session.user.id,
    targetUserId: book.clientId,
    detail: `${isAdmin ? "Admin visualizó" : "Visualizó"} el libro: "${book.title}" (${book.documents.length} hojas)`,
    ip: getClientIp(req.headers),
    userAgent: getUserAgent(req.headers),
  });

  return NextResponse.json({ id: book.id, title: book.title, pages });
}
