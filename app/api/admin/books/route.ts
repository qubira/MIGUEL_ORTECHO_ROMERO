import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, clientId } = body;

  if (!title || !clientId) {
    return NextResponse.json(
      { error: "Faltan datos del libro." },
      { status: 400 }
    );
  }

  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client || client.role !== "CLIENT") {
    return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
  }

  const book = await prisma.book.create({
    data: { title: String(title).trim(), clientId },
  });

  return NextResponse.json({ book });
}
