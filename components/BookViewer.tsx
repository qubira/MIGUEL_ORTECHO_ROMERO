"use client";

import { useEffect, useState } from "react";

type Page = {
  id: string;
  pageNumber: number;
  title: string;
  url: string;
};

type ViewMode = "spread" | "single";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

function MagnifierIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function BookViewer({
  kind,
  id,
  title,
  onClose,
  inline = false,
}: {
  kind: "book" | "single";
  id: string;
  title: string;
  onClose?: () => void;
  inline?: boolean;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ViewMode>("spread");
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

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
    setZoom(1);
  }, [mode, index, pages]);

  useEffect(() => {
    if (inline) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
      if (mode === "spread") {
        if (e.key === "ArrowRight") goNext();
        if (e.key === "ArrowLeft") goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode, pages, inline]);

  function goNext() {
    setIndex((i) => Math.min(i + 2, Math.max(pages.length - 2, 0)));
  }

  function goPrev() {
    setIndex((i) => Math.max(i - 2, 0));
  }

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }

  const spreadPages = pages.slice(index, index + 2);
  const atStart = index === 0;
  const atEnd = index + 2 >= pages.length;
  const spreadBaseVh = inline ? 62 : 78;
  const singleBaseVh = inline ? 62 : 76;

  // Zoom resizes the image itself (real height) instead of a CSS transform,
  // so the bounding box's overflow-auto can actually scroll to the parts
  // that grow past it — a scaled transform on a centered flex child gets
  // clipped instead of becoming scrollable in most browsers.
  function pageImageStyle(baseVh: number) {
    return {
      height: `${baseVh * zoom}vh`,
      width: "auto" as const,
      maxWidth: zoom <= 1 ? "100%" : "none",
      display: "block" as const,
      margin: "0 auto",
    };
  }

  const zoomControl = pages.length > 0 && (
    <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-1.5 py-1">
      <span className="text-gray-400 pl-0.5">
        <MagnifierIcon />
      </span>
      <button
        onClick={zoomOut}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Reducir zoom"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-200 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
      >
        −
      </button>
      <span className="w-10 text-center text-xs text-gray-300 tabular-nums select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={zoomIn}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Aumentar zoom"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-200 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
      >
        +
      </button>
    </div>
  );

  return (
    <div
      className={
        inline
          ? "bg-navy-900 rounded-xl overflow-hidden flex flex-col"
          : "fixed inset-0 z-50 bg-black/90 flex flex-col"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-navy-900 border-b border-white/10 text-white">
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
          {zoomControl}
          {pages.length > 1 && (
            <div className="flex rounded-lg overflow-hidden border border-white/20">
              <button
                onClick={() => {
                  setMode("spread");
                  setIndex((i) => i - (i % 2));
                }}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  mode === "spread"
                    ? "bg-gold-600 text-white"
                    : "bg-transparent text-gray-200 hover:bg-white/10"
                }`}
              >
                Libro abierto
              </button>
              <button
                onClick={() => setMode("single")}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  mode === "single"
                    ? "bg-gold-600 text-white"
                    : "bg-transparent text-gray-200 hover:bg-white/10"
                }`}
              >
                Individual
              </button>
            </div>
          )}
          {!inline && (
            <button
              onClick={onClose}
              aria-label="Cerrar visor"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 text-gray-200 hover:bg-white/10 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className={`${inline ? "py-10" : "flex-1"} flex items-center justify-center`}>
          <p className="text-gray-200 text-sm">Cargando documento...</p>
        </div>
      )}
      {error && (
        <div className={`${inline ? "py-10" : "flex-1"} flex items-center justify-center`}>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && mode === "spread" && (
        <div
          className={`${
            inline ? "py-6" : "flex-1"
          } flex items-center justify-center relative px-4 overflow-hidden`}
        >
          <button
            onClick={goPrev}
            disabled={atStart}
            aria-label="Página anterior"
            className="absolute left-2 md:left-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl flex items-center justify-center"
          >
            ‹
          </button>

          <div className="flex items-stretch gap-0 shadow-2xl">
            {spreadPages.map((page, i) => (
              <div
                key={page.id}
                className={`bg-white overflow-auto ${
                  i === 0 ? "border-r border-black/10" : ""
                }`}
                style={{ maxHeight: `${spreadBaseVh}vh`, maxWidth: "44vw" }}
              >
                <img
                  src={page.url}
                  alt={page.title}
                  style={pageImageStyle(spreadBaseVh)}
                />
              </div>
            ))}
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
        <div className="flex justify-center gap-3 py-3 bg-navy-900 border-t border-white/10">
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
        <div className={`px-4 py-6 ${inline ? "" : "flex-1 overflow-y-auto"}`}>
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            {pages.map((page) => (
              <div key={page.id} className="flex flex-col items-center w-full">
                <div
                  className="mx-auto overflow-auto shadow-2xl bg-white"
                  style={{
                    maxHeight: `${singleBaseVh}vh`,
                    maxWidth: "100%",
                    width: "fit-content",
                  }}
                >
                  <img
                    src={page.url}
                    alt={page.title}
                    style={pageImageStyle(singleBaseVh)}
                  />
                </div>
                <div className="w-full flex items-center justify-between px-1 pt-2">
                  <span className="text-xs text-gray-300">
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
