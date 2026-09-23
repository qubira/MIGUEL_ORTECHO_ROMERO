"use client";

import { useEffect, useRef, useState } from "react";
import type { RedactionStroke } from "@/lib/redaction";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const BASE_VH = 78;

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

export default function RedactEditor({
  documentId,
  title,
  onClose,
  onSaved,
}: {
  documentId: string;
  title: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [strokes, setStrokes] = useState<RedactionStroke[]>([]);
  const [brushSize, setBrushSize] = useState(0.03);
  const [zoom, setZoom] = useState(1);
  const drawingRef = useRef(false);
  // Points are captured against this element, which is sized to exactly
  // match the (possibly zoomed) image — not the clipped scroll viewport —
  // so getBoundingClientRect() already accounts for any scroll offset.
  const imageWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/documents/${documentId}/view`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el documento.");
        if (!cancelled) {
          setImageUrl(data.url);
          setStrokes(Array.isArray(data.redactions) ? data.redactions : []);
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
  }, [documentId]);

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }

  function getRelativePoint(e: React.PointerEvent) {
    const rect = imageWrapRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const point = getRelativePoint(e);
    setStrokes((prev) => [...prev, { points: [point], size: brushSize }]);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const point = getRelativePoint(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const last = prev[prev.length - 1];
      next.push({ ...last, points: [...last.points, point] });
      return next;
    });
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    if (strokes.length > 0 && !confirm("¿Borrar todas las marcas de esta hoja?")) {
      return;
    }
    setStrokes([]);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redactions: strokes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-navy-900 text-white border-b border-white/10">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">Cubrir datos sensibles</h3>
          <p className="text-xs text-gray-300 truncate">{title}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <label className="flex items-center gap-2 text-xs text-gray-300">
            Grosor
            <input
              type="range"
              min={0.01}
              max={0.08}
              step={0.005}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 align-middle"
            />
          </label>
          <button
            onClick={undo}
            disabled={strokes.length === 0}
            className="inline-flex items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Deshacer
          </button>
          <button
            onClick={clearAll}
            disabled={strokes.length === 0}
            className="inline-flex items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Borrar todo
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gold-500 transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 text-gray-200 hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        {loading && <p className="text-gray-200 text-sm">Cargando documento...</p>}
        {error && <p className="text-red-300 text-sm">{error}</p>}

        {!loading && imageUrl && (
          <div
            className="overflow-auto bg-black/20"
            style={{ maxWidth: "90vw", maxHeight: `${BASE_VH}vh` }}
          >
            <div
              ref={imageWrapRef}
              className="relative bg-white shadow-2xl touch-none select-none"
              style={{ width: "fit-content" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <img
                src={imageUrl}
                alt={title}
                draggable={false}
                className="block max-w-none select-none pointer-events-none"
                style={{ height: `${BASE_VH * zoom}vh`, width: "auto" }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
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
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 pb-3 px-4">
        Dibuja sobre los datos que quieras cubrir. Usa el zoom para más
        precisión. El cliente no verá esa zona, salvo que active el modo
        seguro con su propia contraseña.
      </p>
    </div>
  );
}
