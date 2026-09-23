import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!name && !newPassword) {
    return NextResponse.json(
      { error: "No hay cambios para guardar." },
      { status: 400 }
    );
  }
  if (name === "") {
    return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const data: { name?: string; passwordHash?: string } = {};

  if (name) {
    data.name = name;
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Ingresa tu contraseña actual para cambiarla." },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Tu contraseña actual no es correcta." },
        { status: 403 }
      );
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { name: true, username: true },
  });

  return NextResponse.json({ name: updated.name, username: updated.username });
}
