import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";

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
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : "";

  if (!name && !password) {
    return NextResponse.json(
      { error: "No hay cambios para guardar." },
      { status: 400 }
    );
  }
  if (name === "") {
    return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
  }
  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  const client = await prisma.user.findUnique({ where: { id } });
  if (!client || client.role !== "CLIENT") {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const data: { name?: string; passwordHash?: string } = {};
  if (name) data.name = name;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, username: true, createdAt: true },
  });

  return NextResponse.json({ client: updated });
}
