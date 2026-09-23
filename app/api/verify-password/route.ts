import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSecureModeToken, SECURE_MODE_COOKIE } from "@/lib/secureMode";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (!password) {
    return NextResponse.json({ error: "Ingresa tu contraseña." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  await logAudit({
    action: "SECURE_MODE_UNLOCK",
    actorId: user.id,
    detail: "Activó el modo seguro para ver datos cubiertos",
    ip: getClientIp(req.headers),
    userAgent: getUserAgent(req.headers),
  });

  const res = NextResponse.json({ ok: true });
  const { value, maxAge } = createSecureModeToken(user.id);
  res.cookies.set(SECURE_MODE_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
