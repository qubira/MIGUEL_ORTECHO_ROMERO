"use client";

import { useEffect, useMemo, useState } from "react";
import ClientForm from "./ClientForm";
import UploadForm from "./UploadForm";
import BookViewer from "@/components/BookViewer";

type Client = {
  id: string;
  name: string;
  username: string;
  createdAt: string;
};

type Document = {
  id: string;
  title: string;
  uploadedAt: string;
  bytes: number | null;
  pageNumber: number;
  book: { id: string; title: string } | null;
};

type DocGroup = {
  key: string;
  title: string;
  isBook: boolean;
  uploadedAt: string;
  docs: Document[];
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function groupDocuments(documents: Document[]): DocGroup[] {
  const groups: DocGroup[] = [];
  const index = new Map<string, DocGroup>();

  for (const doc of documents) {
    const key = doc.book?.id || doc.id;
    let group = index.get(key);
    if (!group) {
      group = {
        key,
        title: doc.book?.title || doc.title,
        isBook: !!doc.book,
        uploadedAt: doc.uploadedAt,
        docs: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    group.docs.push(doc);
  }

  for (const group of groups) {
    group.docs.sort((a, b) => a.pageNumber - b.pageNumber);
  }

  return groups;
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
  const [viewing, setViewing] = useState<{
    kind: "book" | "single";
    id: string;
    title: string;
  } | null>(null);
  const [reordering, setReordering] = useState<Set<string>>(new Set());
  const [savingOrder, setSavingOrder] = useState(false);

  const groups = useMemo(() => groupDocuments(documents), [documents]);

  function toggleReorder(key: string) {
    setReordering((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function movePage(group: DocGroup, from: number, to: number) {
    if (to < 0 || to >= group.docs.length || savingOrder) return;
    const reordered = [...group.docs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    setSavingOrder(true);
    try {
      await fetch(`/api/admin/books/${group.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((d) => d.id) }),
      });
      if (selected) await loadDocuments(selected.id);
    } finally {
      setSavingOrder(false);
    }
  }

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

  async function handleDeleteGroup(group: DocGroup) {
    const label = group.isBook
      ? `el libro "${group.title}" (${group.docs.length} hojas)`
      : "este documento";
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) {
      return;
    }
    if (group.isBook) {
      await fetch(`/api/admin/books/${group.key}`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/documents/${group.key}`, { method: "DELETE" });
    }
    if (selected) loadDocuments(selected.id);
  }

  async function handleDeletePage(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    await fetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
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
                      {c.username}
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
                  {groups.map((group) => {
                    const totalBytes = group.docs.reduce(
                      (sum, d) => sum + (d.bytes || 0),
                      0
                    );
                    const isReordering = reordering.has(group.key);
                    return (
                      <div key={group.key} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">
                              {group.title}
                              {group.isBook && (
                                <span className="ml-2 text-xs font-normal text-gold-600">
                                  {group.docs.length} hojas
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(group.uploadedAt).toLocaleDateString("es-PE")}
                              {totalBytes ? ` · ${formatBytes(totalBytes)}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {group.isBook && group.docs.length > 1 && (
                              <button
                                onClick={() => toggleReorder(group.key)}
                                className="btn-secondary"
                              >
                                {isReordering ? "Listo" : "Editar hojas"}
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setViewing({
                                  kind: group.isBook ? "book" : "single",
                                  id: group.key,
                                  title: group.title,
                                })
                              }
                              className="btn-secondary"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group)}
                              className="btn-danger"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>

                        {isReordering && (
                          <ul className="mt-3 space-y-1 bg-gray-50 rounded-lg p-2">
                            {group.docs.map((doc, i) => (
                              <li
                                key={doc.id}
                                className="flex items-center justify-between bg-white rounded-md border border-gray-200 px-3 py-1.5"
                              >
                                <span className="text-sm text-gray-700">
                                  {i + 1}. {doc.title}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => movePage(group, i, i - 1)}
                                    disabled={i === 0 || savingOrder}
                                    aria-label="Mover arriba"
                                    className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => movePage(group, i, i + 1)}
                                    disabled={i === group.docs.length - 1 || savingOrder}
                                    aria-label="Mover abajo"
                                    className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => handleDeletePage(doc)}
                                    aria-label="Eliminar hoja"
                                    className="w-7 h-7 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {viewing && (
        <BookViewer
          kind={viewing.kind}
          id={viewing.id}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
