"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function ProfileSettings({ username }: { username: string }) {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar.");

      if (data.name) await update({ name: data.name });
      setSuccess("Tus datos se actualizaron correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Usuario</label>
        <input
          className="input bg-gray-100 text-gray-500 cursor-not-allowed"
          value={username}
          disabled
          readOnly
        />
        <p className="text-xs text-gray-400 mt-1">
          El usuario de acceso no se puede cambiar.
        </p>
      </div>
      <div>
        <label className="label">Nombre</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Contraseña actual</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
          />
        </div>
      </div>
      {newPassword && (
        <div>
          <label className="label">Confirmar nueva contraseña</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
