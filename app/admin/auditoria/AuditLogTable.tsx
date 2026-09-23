"use client";

import { useEffect, useState } from "react";

type LogUser = { id: string; name: string; username: string; role?: string } | null;

type AuditLog = {
  id: string;
  action: string;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: LogUser;
  targetUser: LogUser;
};

type UserOption = { id: string; name: string; username: string };

const ACTION_META: Record<string, { label: string; className: string }> = {
  LOGIN: {
    label: "Inicio de sesión",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  PASSWORD_CHANGE: {
    label: "Cambio de contraseña",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  NAME_CHANGE: {
    label: "Cambio de nombre",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  DOWNLOAD: {
    label: "Descarga",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SECURE_MODE_UNLOCK: {
    label: "Modo seguro activado",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  DOCUMENT_VIEW: {
    label: "Vio documento",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export default function AuditLogTable({
  initialLogs,
  users,
}: {
  initialLogs: AuditLog[];
  users: UserOption[];
}) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (action) params.set("action", action);

    setLoading(true);
    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, [userId, action]);

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-gray-800">Registro de auditoría</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="input !w-auto text-sm"
          >
            <option value="">Todos los usuarios</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.username})
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="input !w-auto text-sm"
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">No hay actividad registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Fecha y hora</th>
                <th className="py-2 pr-3 font-medium">Usuario</th>
                <th className="py-2 pr-3 font-medium">Acción</th>
                <th className="py-2 pr-3 font-medium">Detalle</th>
                <th className="py-2 pr-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const meta = ACTION_META[log.action] || {
                  label: log.action,
                  className: "bg-gray-50 text-gray-700 border-gray-200",
                };
                return (
                  <tr key={log.id} className="align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-gray-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-800">
                        {log.actor?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.actor?.username}
                        {log.actor?.role === "ADMIN" ? " · admin" : ""}
                      </p>
                      {log.targetUser && log.targetUser.id !== log.actor?.id && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          sobre {log.targetUser.name} ({log.targetUser.username})
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-700 max-w-xs">
                      {log.detail || "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">
                      {log.ip || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
