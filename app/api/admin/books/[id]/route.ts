import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const book = await prisma.book.findUnique({
    where: { id },
    include: { documents: true },
  });
  if (!book) {
    return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
  }

  await Promise.all(
    book.documents.map((doc) =>
      cloudinary.uploader
        .destroy(doc.publicId, {
          resource_type: doc.resourceType,
          type: "private",
        })
        .catch(() => null)
    )
  );

  await prisma.book.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const order: unknown = body.order;
  if (!Array.isArray(order) || order.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "Orden inválido." }, { status: 400 });
  }

  const book = await prisma.book.findUnique({
    where: { id },
    include: { documents: true },
  });
  if (!book) {
    return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
  }

  const bookDocIds = new Set(book.documents.map((d) => d.id));
  const orderIds = order as string[];
  if (
    orderIds.length !== book.documents.length ||
    !orderIds.every((docId) => bookDocIds.has(docId)) ||
    new Set(orderIds).size !== orderIds.length
  ) {
    return NextResponse.json(
      { error: "El orden debe incluir exactamente las hojas del libro." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    orderIds.map((docId, i) =>
      prisma.document.update({
        where: { id: docId },
        data: { pageNumber: i + 1 },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
