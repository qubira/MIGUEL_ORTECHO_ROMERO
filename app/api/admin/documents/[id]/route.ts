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

  return NextResponse.json({ ok: true });
}
