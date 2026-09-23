import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const clientId = req.nextUrl.searchParams.get("clientId") || undefined;

  const documents = await prisma.document.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: [{ uploadedAt: "desc" }, { pageNumber: "asc" }],
    include: {
      client: { select: { name: true, username: true } },
      book: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { title, clientId, publicId, format, bytes, resourceType, bookId, pageNumber } =
    body;

  if (!title || !clientId || !publicId) {
    return NextResponse.json(
      { error: "Faltan datos del documento." },
      { status: 400 }
    );
  }

  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client || client.role !== "CLIENT") {
    return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
  }

  if (bookId) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.clientId !== clientId) {
      return NextResponse.json({ error: "Libro inválido." }, { status: 400 });
    }
  }

  const document = await prisma.document.create({
    data: {
      title: String(title).trim(),
      clientId,
      publicId,
      format: format || null,
      resourceType: resourceType || "raw",
      bytes: bytes || null,
      bookId: bookId || null,
      pageNumber: Number.isFinite(pageNumber) ? Number(pageNumber) : 1,
    },
  });

  return NextResponse.json({ document });
}
