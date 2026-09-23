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
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function uploadOne(file: File, bookId?: string, pageNumber?: number) {
    const sigRes = await fetch("/api/admin/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const sig = await sigRes.json();
    if (!sigRes.ok) throw new Error(sig.error || "No se pudo iniciar la subida.");

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

    const docTitle = bookId
      ? `Página ${pageNumber}`
      : title || file.name;

    const saveRes = await fetch("/api/admin/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: docTitle,
        clientId,
        publicId: uploaded.public_id,
        format: uploaded.format,
        bytes: uploaded.bytes,
        resourceType: uploaded.resource_type,
        bookId: bookId || undefined,
        pageNumber: pageNumber || 1,
      }),
    });
    const saved = await saveRes.json();
    if (!saveRes.ok) throw new Error(saved.error || "No se pudo guardar el documento.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (files.length === 0) {
      setError("Selecciona al menos un archivo.");
      return;
    }

    setLoading(true);
    try {
      if (files.length === 1) {
        setProgress("Subiendo documento...");
        await uploadOne(files[0]);
      } else {
        setProgress("Creando libro de documentos...");
        const bookRes = await fetch("/api/admin/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title || `Documento (${files.length} hojas)`,
            clientId,
          }),
        });
        const bookData = await bookRes.json();
        if (!bookRes.ok) throw new Error(bookData.error || "No se pudo crear el libro.");
        const bookId = bookData.book.id as string;

        for (let i = 0; i < files.length; i++) {
          setProgress(`Subiendo hoja ${i + 1} de ${files.length}...`);
          await uploadOne(files[i], bookId, i + 1);
        }
      }

      setTitle("");
      setFiles([]);
      const input = document.getElementById("file-input") as HTMLInputElement | null;
      if (input) input.value = "";
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
        <label className="label">
          {files.length > 1 ? "Título del libro" : "Título del documento"}
        </label>
        <input
          className="input"
          placeholder="Ej. Escritura pública N° 1234"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="label">
          Archivo(s) escaneado(s) (PDF o imagen) — puedes seleccionar varias hojas
        </label>
        <input
          id="file-input"
          type="file"
          accept=".pdf,image/*"
          multiple
          className="input"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          required
        />
        {files.length > 1 && (
          <p className="text-xs text-gray-500 mt-1">
            {files.length} hojas seleccionadas. Se subirán en orden como un solo
            libro de documentos.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && <p className="text-sm text-gray-500">{progress}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Subiendo..." : "Subir documento"}
      </button>
    </form>
  );
}
