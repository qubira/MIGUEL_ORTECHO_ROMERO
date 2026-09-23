import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { requireAdminSession } from "@/lib/requireAdmin";
import { isValidRedactions } from "@/lib/redaction";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  await cloudinary.uploader
    .destroy(document.publicId, {
      resource_type: document.resourceType,
      type: "private",
    })
    .catch(() => null);

  await prisma.document.delete({ where: { id } });

  if (document.bookId) {
    const remaining = await prisma.document.count({
      where: { bookId: document.bookId },
    });
    if (remaining === 0) {
      await prisma.book.delete({ where: { id: document.bookId } }).catch(() => null);
    }
  }

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
  if (!isValidRedactions(body.redactions)) {
    return NextResponse.json({ error: "Datos de redacción inválidos." }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: { redactions: body.redactions },
  });

  return NextResponse.json({ document: updated });
}
