"use client";

import { useState } from "react";

type Client = {
  id: string;
  name: string;
  username: string;
  createdAt: string;
};

export default function ClientForm({
  onCreated,
}: {
  onCreated: (client: Client) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo crear el cliente.");
      return;
    }

    onCreated(data.client);
    setSuccess(
      `Cliente creado. Comparte con él/ella el link del portal, el usuario "${username}" y esta contraseña: "${password}".`
    );
    setName("");
    setUsername("");
    setPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Nombre del cliente</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Usuario de acceso</label>
        <input
          type="text"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Contraseña</label>
        <input
          type="text"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creando..." : "Crear cliente"}
      </button>
    </form>
  );
}
