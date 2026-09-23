"use client";

import { useMemo, useState } from "react";
import BookViewer from "@/components/BookViewer";

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
  pageCount: number;
  totalBytes: number;
};

function formatBytes(bytes: number) {
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
        pageCount: 0,
        totalBytes: 0,
      };
      index.set(key, group);
      groups.push(group);
    }
    group.pageCount += 1;
    group.totalBytes += doc.bytes || 0;
  }

  return groups;
}

export default function DashboardDocuments({
  documents,
}: {
  documents: Document[];
}) {
  // Acordeón: solo una sección puede estar abierta a la vez. Si el cliente
  // no reconoce un documento, basta con abrir otro (o volver a tocar el
  // mismo) para que las demás se cierren solas.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const groups = useMemo(() => groupDocuments(documents), [documents]);

  if (groups.length === 0) {
    return (
      <div className="card text-center text-gray-500">
        Todavía no tienes documentos disponibles. Cuando el despacho suba un
        documento a tu nombre, aparecerá aquí.
      </div>
    );
  }

  function toggle(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = expandedKey === group.key;
        return (
          <div key={group.key} className="card p-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4">
              <button
                onClick={() => toggle(group.key)}
                className="flex-1 flex items-center justify-between gap-3 text-left min-w-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {group.title}
                    {group.isBook && (
                      <span className="ml-2 text-xs font-normal text-gold-600">
                        {group.pageCount} hojas
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(group.uploadedAt).toLocaleDateString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {group.totalBytes ? ` · ${formatBytes(group.totalBytes)}` : ""}
                  </p>
                </div>
                <span
                  className={`text-gray-400 shrink-0 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>

              {group.isBook && (
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden shrink-0">
                  <span className="px-2.5 py-2 text-xs text-gray-500 bg-gray-50 border-r border-gray-300">
                    Descargar todo
                  </span>
                  <a
                    href={`/api/documents/book/${group.key}/download-pdf`}
                    className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition border-r border-gray-300"
                  >
                    PDF
                  </a>
                  <a
                    href={`/api/documents/book/${group.key}/download-zip`}
                    className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Imágenes
                  </a>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="border-t border-gray-200">
                <BookViewer
                  key={`${group.isBook ? "book" : "single"}-${group.key}`}
                  kind={group.isBook ? "book" : "single"}
                  id={group.key}
                  title={group.title}
                  inline
                  redactable
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
