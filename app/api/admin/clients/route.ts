import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, username: true, createdAt: true },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || !username || password.length < 6) {
    return NextResponse.json(
      { error: "Nombre, usuario y una contraseña de al menos 6 caracteres son obligatorios." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese nombre de usuario." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const client = await prisma.user.create({
    data: { name, username, passwordHash, role: "CLIENT" },
    select: { id: true, name: true, username: true, createdAt: true },
  });

  return NextResponse.json({ client });
}
