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
