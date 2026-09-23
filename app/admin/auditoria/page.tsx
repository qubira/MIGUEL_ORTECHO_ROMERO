import { prisma } from "@/lib/prisma";
import AuditLogTable from "./AuditLogTable";

export default async function AuditoriaPage() {
  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        actor: { select: { id: true, name: true, username: true, role: true } },
        targetUser: { select: { id: true, name: true, username: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true },
    }),
  ]);

  const serialized = logs.map((log) => ({
    id: log.id,
    action: log.action,
    detail: log.detail,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
    actor: log.actor,
    targetUser: log.targetUser,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Auditoría</h1>
        <p className="text-sm text-gray-500">
          Inicios de sesión, cambios de nombre/contraseña y descargas, con
          fecha, hora e IP de origen.
        </p>
      </div>
      <AuditLogTable initialLogs={serialized} users={users} />
    </div>
  );
}
