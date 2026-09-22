"use client";

import { useState } from "react";

export default function UploadForm({
  clientId,
  onUploaded,
}: {
  clientId: string;
  onUploaded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Selecciona un archivo.");
      return;
    }

    setLoading(true);
    try {
      setProgress("Preparando subida segura...");
      const sigRes = await fetch("/api/admin/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig.error || "No se pudo iniciar la subida.");

      setProgress("Subiendo documento a Cloudinary...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);
      formData.append("type", sig.type);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploaded.error?.message || "Falló la subida a Cloudinary.");
      }

      setProgress("Guardando registro del documento...");
      const saveRes = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          clientId,
          publicId: uploaded.public_id,
          format: uploaded.format,
          bytes: uploaded.bytes,
          resourceType: uploaded.resource_type,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || "No se pudo guardar el documento.");

      setTitle("");
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value &&
        ((document.getElementById("file-input") as HTMLInputElement).value = "");
      onUploaded();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al subir el documento.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Título del documento</label>
        <input
          className="input"
          placeholder="Ej. Escritura pública N° 1234"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Archivo escaneado (PDF o imagen)</label>
        <input
          id="file-input"
          type="file"
          accept=".pdf,image/*"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && <p className="text-sm text-gray-500">{progress}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Subiendo..." : "Subir documento"}
      </button>
    </form>
  );
}
