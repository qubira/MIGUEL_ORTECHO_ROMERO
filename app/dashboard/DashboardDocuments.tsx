"use client";

import { useMemo } from "react";
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
};

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
      };
      index.set(key, group);
      groups.push(group);
    }
    group.pageCount += 1;
  }

  return groups;
}

export default function DashboardDocuments({
  documents,
}: {
  documents: Document[];
}) {
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
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-sm text-gray-600 mb-2">
            {new Date(group.uploadedAt).toLocaleDateString("es-PE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {group.isBook ? ` · ${group.pageCount} hojas` : ""}
          </p>
          <BookViewer
            kind={group.isBook ? "book" : "single"}
            id={group.key}
            title={group.title}
            inline
          />
        </div>
      ))}
    </div>
  );
}
