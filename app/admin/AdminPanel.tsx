"use client";

import { useEffect, useMemo, useState } from "react";
import ClientForm from "./ClientForm";
import EditClientForm from "./EditClientForm";
import UploadForm from "./UploadForm";
import BookViewer from "@/components/BookViewer";
import RedactEditor from "@/components/RedactEditor";

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
  redactions?: unknown;
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
  const [redacting, setRedacting] = useState<{ id: string; title: string } | null>(
    null
  );
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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
    await saveOrder(group, reordered.map((d) => d.id));
  }

  async function saveOrder(group: DocGroup, orderedIds: string[]) {
    setSavingOrder(true);
    try {
      await fetch(`/api/admin/books/${group.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderedIds }),
      });
      if (selected) await loadDocuments(selected.id);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleReverseOrder(group: DocGroup) {
    if (savingOrder) return;
    if (
      !confirm(
        `¿Invertir el orden de las ${group.docs.length} hojas? La primera pasará a ser la última y así con todas.`
      )
    ) {
      return;
    }
    const reversed = [...group.docs].reverse().map((d) => d.id);
    await saveOrder(group, reversed);
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
                <li key={c.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelected(c)}
                    className={`flex-1 min-w-0 text-left py-2 px-2 rounded-lg transition ${
                      selected?.id === c.id
                        ? "bg-navy-800 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p
                      className={`text-xs truncate ${
                        selected?.id === c.id ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {c.username}
                    </p>
                  </button>
                  <button
                    onClick={() => setEditingClient(c)}
                    aria-label={`Editar ${c.name}`}
                    title="Editar cliente"
                    className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center transition ${
                      selected?.id === c.id
                        ? "text-gray-300 hover:bg-gray-200/20"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    ✏️
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
                <div className="space-y-3">
                  {groups.map((group) => {
                    const totalBytes = group.docs.reduce(
                      (sum, d) => sum + (d.bytes || 0),
                      0
                    );
                    const isReordering = reordering.has(group.key);
                    return (
                      <div
                        key={group.key}
                        className="rounded-xl border border-gray-200 p-4 transition hover:border-gray-300 hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-lg bg-navy-50 text-navy-800 flex items-center justify-center text-lg">
                              {group.isBook ? "📚" : "📄"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {group.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {group.isBook && (
                                  <span className="inline-flex items-center rounded-full bg-gold-500/10 text-gold-600 border border-gold-500/30 px-2 py-0.5 text-[11px] font-medium">
                                    {group.docs.length} hojas
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(group.uploadedAt).toLocaleDateString("es-PE")}
                                  {totalBytes ? ` · ${formatBytes(totalBytes)}` : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {group.isBook && group.docs.length > 1 && (
                              <>
                                <button
                                  onClick={() => handleReverseOrder(group)}
                                  disabled={savingOrder}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Invierte el orden de todas las hojas: la primera pasa a ser la última"
                                >
                                  <span aria-hidden>🔄</span> Invertir orden
                                </button>
                                <button
                                  onClick={() => toggleReorder(group.key)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                    isReordering
                                      ? "border-navy-800 bg-navy-800 text-white hover:bg-navy-700"
                                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <span aria-hidden>✏️</span>{" "}
                                  {isReordering ? "Listo" : "Editar hojas"}
                                </button>
                              </>
                            )}
                            {group.docs.length === 1 && (
                              <button
                                onClick={() =>
                                  setRedacting({
                                    id: group.docs[0].id,
                                    title: group.title,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                              >
                                <span aria-hidden>🖌</span> Cubrir datos
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
                              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-xs font-medium text-white hover:bg-navy-700 transition"
                            >
                              <span aria-hidden>👁</span> Ver
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group)}
                              aria-label={group.isBook ? "Eliminar libro" : "Eliminar documento"}
                              title={group.isBook ? "Eliminar libro" : "Eliminar documento"}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {isReordering && (
                          <ul className="mt-3 space-y-1.5 bg-gray-50 rounded-lg p-2 border border-gray-100">
                            {group.docs.map((doc, i) => (
                              <li
                                key={doc.id}
                                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2"
                              >
                                <span className="text-sm text-gray-700 truncate">
                                  <span className="text-gray-400 font-medium mr-1.5">
                                    {i + 1}.
                                  </span>
                                  {doc.title}
                                  {Array.isArray(doc.redactions) &&
                                    doc.redactions.length > 0 && (
                                      <span
                                        className="ml-1.5"
                                        title="Tiene datos cubiertos"
                                        aria-label="Tiene datos cubiertos"
                                      >
                                        🔒
                                      </span>
                                    )}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() =>
                                      setViewing({
                                        kind: "single",
                                        id: doc.id,
                                        title: `${group.title} — ${doc.title}`,
                                      })
                                    }
                                    aria-label="Previsualizar hoja"
                                    title="Previsualizar"
                                    className="w-7 h-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                  >
                                    👁
                                  </button>
                                  <button
                                    onClick={() =>
                                      setRedacting({
                                        id: doc.id,
                                        title: `${group.title} — ${doc.title}`,
                                      })
                                    }
                                    aria-label="Cubrir datos sensibles"
                                    title="Cubrir datos sensibles"
                                    className="w-7 h-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                  >
                                    🖌
                                  </button>
                                  <button
                                    onClick={() => movePage(group, i, i - 1)}
                                    disabled={i === 0 || savingOrder}
                                    aria-label="Mover arriba"
                                    title="Mover arriba"
                                    className="w-7 h-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => movePage(group, i, i + 1)}
                                    disabled={i === group.docs.length - 1 || savingOrder}
                                    aria-label="Mover abajo"
                                    title="Mover abajo"
                                    className="w-7 h-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => handleDeletePage(doc)}
                                    aria-label="Eliminar hoja"
                                    title="Eliminar hoja"
                                    className="w-7 h-7 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition"
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
          key={`${viewing.kind}-${viewing.id}`}
          kind={viewing.kind}
          id={viewing.id}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}

      {redacting && (
        <RedactEditor
          documentId={redacting.id}
          title={redacting.title}
          onClose={() => setRedacting(null)}
          onSaved={() => {
            if (selected) loadDocuments(selected.id);
          }}
        />
      )}

      {editingClient && (
        <EditClientForm
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={(updated) => {
            setClients((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
            setSelected((prev) => (prev?.id === updated.id ? updated : prev));
          }}
        />
      )}
    </div>
  );
}
