"use client";

import { useEffect, useState } from "react";
import type { RedactionStroke } from "@/lib/redaction";

type Page = {
  id: string;
  pageNumber: number;
  title: string;
  url: string;
  redactions?: RedactionStroke[] | null;
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

function pageHasRedactions(page: Page) {
  return Array.isArray(page.redactions) && page.redactions.length > 0;
}

function RedactionOverlay({ strokes }: { strokes: RedactionStroke[] }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      {strokes.map((s, i) => (
        <polyline
          key={i}
          points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="black"
          strokeWidth={s.size}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default function BookViewer({
  kind,
  id,
  title,
  onClose,
  inline = false,
  redactable = false,
}: {
  kind: "book" | "single";
  id: string;
  title: string;
  onClose?: () => void;
  inline?: boolean;
  redactable?: boolean;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ViewMode>("spread");
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [secureUnlocked, setSecureUnlocked] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

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
              {
                id: data.id,
                pageNumber: 1,
                title: data.title,
                url: data.url,
                redactions: data.redactions,
              },
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
    // No usar Math.max(pages.length - 2, 0) como tope: en un libro con un
    // número impar de hojas eso reengancha el índice en una página impar y
    // repite la página del medio en dos vistas seguidas en vez de avanzar
    // limpiamente hasta que la última hoja quede sola (como en un libro real).
    setIndex((i) => (i + 2 < pages.length ? i + 2 : i));
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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Contraseña incorrecta.");
      setSecureUnlocked(true);
      setShowUnlock(false);
      setPassword("");
    } catch (err: any) {
      setVerifyError(err.message || "Contraseña incorrecta.");
    } finally {
      setVerifying(false);
    }
  }

  const spreadPages = pages.slice(index, index + 2);
  const atStart = index === 0;
  const atEnd = index + 2 >= pages.length;
  const spreadBaseVh = inline ? 62 : 78;
  const singleBaseVh = inline ? 62 : 76;
  const hasRedactions = redactable && pages.some(pageHasRedactions);
  const showOverlayOn = (page: Page) =>
    redactable && !secureUnlocked && pageHasRedactions(page);

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
          {hasRedactions &&
            (secureUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 px-2.5 py-1.5 text-xs font-medium">
                🔓 Modo seguro activo
              </span>
            ) : (
              <button
                onClick={() => setShowUnlock((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10 transition"
              >
                🔒 Modo seguro
              </button>
            ))}
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

      {showUnlock && !secureUnlocked && (
        <form
          onSubmit={handleVerify}
          className="flex flex-wrap items-center gap-2 px-4 py-2 bg-navy-800 border-b border-white/10"
        >
          <span className="text-xs text-gray-300">
            Ingresa tu contraseña para ver los datos cubiertos:
          </span>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gold-500 max-w-[180px]"
          />
          <button
            type="submit"
            disabled={verifying}
            className="inline-flex items-center rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gold-500 transition disabled:opacity-50"
          >
            {verifying ? "Verificando..." : "Desbloquear"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUnlock(false);
              setPassword("");
              setVerifyError("");
            }}
            className="text-xs text-gray-300 hover:underline"
          >
            Cancelar
          </button>
          {verifyError && <span className="text-xs text-red-300">{verifyError}</span>}
        </form>
      )}

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
                <div className="relative inline-block">
                  <img
                    src={page.url}
                    alt={page.title}
                    style={pageImageStyle(spreadBaseVh)}
                  />
                  {showOverlayOn(page) && (
                    <RedactionOverlay strokes={page.redactions as RedactionStroke[]} />
                  )}
                </div>
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
          {spreadPages.map((page) =>
            showOverlayOn(page) ? (
              <span
                key={page.id}
                title="Desbloquea el modo seguro para descargar esta hoja"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-500 cursor-not-allowed"
              >
                🔒 Hoja {page.pageNumber}
              </span>
            ) : (
              <a
                key={page.id}
                href={`/api/documents/${page.id}/download`}
                className="btn-secondary text-xs"
              >
                Descargar hoja {page.pageNumber}
              </a>
            )
          )}
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
                  <div className="relative inline-block">
                    <img
                      src={page.url}
                      alt={page.title}
                      style={pageImageStyle(singleBaseVh)}
                    />
                    {showOverlayOn(page) && (
                      <RedactionOverlay strokes={page.redactions as RedactionStroke[]} />
                    )}
                  </div>
                </div>
                <div className="w-full flex items-center justify-between px-1 pt-2">
                  <span className="text-xs text-gray-300">
                    Página {page.pageNumber} de {pages.length}
                  </span>
                  {showOverlayOn(page) ? (
                    <span
                      title="Desbloquea el modo seguro para descargar esta hoja"
                      className="text-xs text-gray-500 cursor-not-allowed"
                    >
                      🔒 Protegida
                    </span>
                  ) : (
                    <a
                      href={`/api/documents/${page.id}/download`}
                      className="btn-secondary text-xs"
                    >
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
