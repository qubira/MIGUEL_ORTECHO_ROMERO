"use client";

import { useEffect, useState } from "react";

type Page = {
  id: string;
  pageNumber: number;
  title: string;
  url: string;
};

type ViewMode = "spread" | "single";

export default function BookViewer({
  kind,
  id,
  title,
  onClose,
}: {
  kind: "book" | "single";
  id: string;
  title: string;
  onClose: () => void;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ViewMode>("spread");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (kind === "book") {
          const res = await fetch(`/api/documents/book/${id}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "No se pudo cargar el libro.");
          if (!cancelled) setPages(data.pages || []);
        } else {
          const res = await fetch(`/api/documents/${id}/view`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "No se pudo cargar el documento.");
          if (!cancelled) {
            setPages([
              { id: data.id, pageNumber: 1, title: data.title, url: data.url },
            ]);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Ocurrió un error al cargar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  useEffect(() => {
    if (pages.length <= 1 && mode === "spread") setMode("single");
  }, [pages, mode]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (mode === "spread") {
        if (e.key === "ArrowRight") goNext();
        if (e.key === "ArrowLeft") goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode, pages]);

  function goNext() {
    setIndex((i) => Math.min(i + 2, Math.max(pages.length - 2, 0)));
  }

  function goPrev() {
    setIndex((i) => Math.max(i - 2, 0));
  }

  const spreadPages = pages.slice(index, index + 2);
  const atStart = index === 0;
  const atEnd = index + 2 >= pages.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-navy-900 text-white">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{title}</h3>
          {pages.length > 0 && (
            <p className="text-xs text-gray-300">
              {mode === "spread"
                ? `Páginas ${spreadPages[0]?.pageNumber ?? ""}${
                    spreadPages[1] ? `–${spreadPages[1].pageNumber}` : ""
                  } de ${pages.length}`
                : `${pages.length} hoja${pages.length === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pages.length > 1 && (
            <div className="flex rounded-lg overflow-hidden border border-white/20">
              <button
                onClick={() => {
                  setMode("spread");
                  setIndex((i) => i - (i % 2));
                }}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  mode === "spread" ? "bg-gold-600 text-white" : "bg-transparent text-gray-200 hover:bg-white/10"
                }`}
              >
                Libro abierto
              </button>
              <button
                onClick={() => setMode("single")}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  mode === "single" ? "bg-gold-600 text-white" : "bg-transparent text-gray-200 hover:bg-white/10"
                }`}
              >
                Individual
              </button>
            </div>
          )}
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-200 text-sm">Cargando documento...</p>
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && mode === "spread" && (
        <div className="flex-1 flex items-center justify-center relative px-4 overflow-hidden">
          <button
            onClick={goPrev}
            disabled={atStart}
            aria-label="Página anterior"
            className="absolute left-2 md:left-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl flex items-center justify-center"
          >
            ‹
          </button>

          <div className="flex items-stretch gap-0 max-h-[80vh] bg-[#e9e2d0] shadow-2xl">
            {spreadPages.map((page, i) => (
              <div
                key={page.id}
                className={`bg-white flex items-center justify-center overflow-hidden relative ${
                  i === 0 ? "border-r border-black/10" : ""
                }`}
                style={{ maxHeight: "80vh" }}
              >
                <img
                  src={page.url}
                  alt={page.title}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              </div>
            ))}
            {spreadPages.length === 1 && (
              <div className="bg-[#e9e2d0]" style={{ width: "1px" }} />
            )}
          </div>

          <button
            onClick={goNext}
            disabled={atEnd}
            aria-label="Página siguiente"
            className="absolute right-2 md:right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl flex items-center justify-center"
          >
            ›
          </button>
        </div>
      )}

      {!loading && !error && mode === "spread" && spreadPages.length > 0 && (
        <div className="flex justify-center gap-3 py-3 bg-navy-900">
          {spreadPages.map((page) => (
            <a
              key={page.id}
              href={`/api/documents/${page.id}/download`}
              className="btn-secondary text-xs"
            >
              Descargar hoja {page.pageNumber}
            </a>
          ))}
        </div>
      )}

      {!loading && !error && mode === "single" && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {pages.map((page) => (
              <div key={page.id} className="bg-white shadow-2xl">
                <img
                  src={page.url}
                  alt={page.title}
                  className="w-full h-auto object-contain block"
                />
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Página {page.pageNumber} de {pages.length}
                  </span>
                  <a
                    href={`/api/documents/${page.id}/download`}
                    className="btn-secondary text-xs"
                  >
                    Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
