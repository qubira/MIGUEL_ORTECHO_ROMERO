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
  const [viewing, setViewing] = useState<{
    kind: "book" | "single";
    id: string;
    title: string;
  } | null>(null);

  const groups = useMemo(() => groupDocuments(documents), [documents]);

  if (groups.length === 0) {
    return (
      <div className="card text-center text-gray-500">
        Todavía no tienes documentos disponibles. Cuando el despacho suba un
        documento a tu nombre, aparecerá aquí.
      </div>
    );
  }

  return (
    <>
      <div className="card divide-y divide-gray-200">
        {groups.map((group) => (
          <div
            key={group.key}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-gray-800">
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
            <div className="flex flex-wrap items-center gap-2">
              {group.isBook && (
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
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
              <button
                onClick={() =>
                  setViewing({
                    kind: group.isBook ? "book" : "single",
                    id: group.key,
                    title: group.title,
                  })
                }
                className="btn-primary"
              >
                Ver documento
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <BookViewer
          key={`${viewing.kind}-${viewing.id}`}
          kind={viewing.kind}
          id={viewing.id}
          title={viewing.title}
          onClose={() => setViewing(null)}
          redactable
        />
      )}
    </>
  );
}
