import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

// El registro de auditoría nunca debe romper la acción real del usuario
// (login, descarga, etc.) si falla al escribir, por eso siempre atrapa
// sus propios errores.
export async function logAudit(params: {
  action: AuditAction;
  actorId?: string | null;
  targetUserId?: string | null;
  detail?: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId || undefined,
        targetUserId: params.targetUserId || undefined,
        detail: params.detail,
        ip: params.ip || undefined,
        userAgent: params.userAgent || undefined,
      },
    });
  } catch (err) {
    console.error("No se pudo registrar la auditoría:", err);
  }
}
