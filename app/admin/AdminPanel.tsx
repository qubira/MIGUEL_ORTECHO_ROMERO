"use client";

import { useEffect, useState } from "react";
import ClientForm from "./ClientForm";
import UploadForm from "./UploadForm";

type Client = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type Document = {
  id: string;
  title: string;
  uploadedAt: string;
  bytes: number | null;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function AdminPanel({
  initialClients,
}: {
  initialClients: Client[];
}) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selected, setSelected] = useState<Client | null>(
    initialClients[0] || null
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showClientForm, setShowClientForm] = useState(clients.length === 0);
  const [loadingDocs, setLoadingDocs] = useState(false);

  async function loadDocuments(clientId: string) {
    setLoadingDocs(true);
    const res = await fetch(`/api/admin/documents?clientId=${clientId}`);
    const data = await res.json();
    setDocuments(data.documents || []);
    setLoadingDocs(false);
  }

  useEffect(() => {
    if (selected) loadDocuments(selected.id);
  }, [selected]);

  async function handleDelete(docId: string) {
    if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) {
      return;
    }
    await fetch(`/api/admin/documents/${docId}`, { method: "DELETE" });
    if (selected) loadDocuments(selected.id);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Clientes</h2>
            <button
              className="text-sm text-navy-700 hover:underline"
              onClick={() => setShowClientForm((v) => !v)}
            >
              {showClientForm ? "Cancelar" : "+ Nuevo cliente"}
            </button>
          </div>

          {showClientForm && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <ClientForm
                onCreated={(client) => {
                  setClients((prev) => [client, ...prev]);
                  setSelected(client);
                  setShowClientForm(false);
                }}
              />
            </div>
          )}

          {clients.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay clientes registrados.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {clients.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c)}
                    className={`w-full text-left py-2 px-2 rounded-lg transition ${
                      selected?.id === c.id
                        ? "bg-navy-800 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <p className="text-sm font-medium">{c.name}</p>
                    <p
                      className={`text-xs ${
                        selected?.id === c.id ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {c.email}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="md:col-span-2 space-y-6">
        {!selected ? (
          <div className="card text-center text-gray-500">
            Crea o selecciona un cliente para subir documentos.
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-3">
                Subir documento para {selected.name}
              </h2>
              <UploadForm
                clientId={selected.id}
                onUploaded={() => loadDocuments(selected.id)}
              />
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-3">
                Documentos de {selected.name}
              </h2>
              {loadingDocs ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Este cliente todavía no tiene documentos.
                </p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString("es-PE")}
                          {doc.bytes ? ` · ${formatBytes(doc.bytes)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="btn-secondary"
                        >
                          Descargar
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="btn-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
