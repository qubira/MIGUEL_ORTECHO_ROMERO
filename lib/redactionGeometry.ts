import type { RedactionPoint } from "@/lib/redaction";

// El pincel guarda "size" como fracción del ancho en un espacio normalizado
// 0..1 x 0..1, y se dibuja (en el editor y en el visor) dentro de un SVG con
// preserveAspectRatio="none", que estira ese espacio de forma NO uniforme
// hasta el ancho/alto reales de la página. Por eso el grosor percibido en
// pantalla de una hoja no depende solo del ancho: depende de la dirección
// del trazo y del alto real de la imagen (páginas verticales estiran mucho
// más en Y que en X). Esta función replica esa misma transformación para
// que el PDF/ZIP exportado cubra exactamente lo mismo que el admin vio y
// aprobó al dibujar, sin dejar franjas de texto visibles en hojas verticales.
export function effectiveStrokeThickness(
  p1: RedactionPoint,
  p2: RedactionPoint,
  size: number,
  width: number,
  height: number
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;

  // Vector perpendicular al trazo, en el espacio normalizado 0..1.
  const nx = -dy / len;
  const ny = dx / len;

  // Se estira igual que el navegador (escala X por el ancho, Y por el alto)
  // y se mide la magnitud resultante: eso es el grosor real en píxeles.
  const scaledX = nx * width;
  const scaledY = ny * height;

  return size * Math.hypot(scaledX, scaledY);
}
