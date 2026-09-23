import { Jimp, JimpMime } from "jimp";
import type { RedactionStroke } from "@/lib/redaction";

function fillSquare(image: any, cx: number, cy: number, size: number) {
  const half = size / 2;
  const x0 = Math.max(0, Math.floor(cx - half));
  const y0 = Math.max(0, Math.floor(cy - half));
  const x1 = Math.min(image.width - 1, Math.ceil(cx + half));
  const y1 = Math.min(image.height - 1, Math.ceil(cy + half));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      image.setPixelColor(0x000000ff, x, y);
    }
  }
}

function stampLine(image: any, x1: number, y1: number, x2: number, y2: number, size: number) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / Math.max(2, size / 2)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillSquare(image, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, size);
  }
}

// Rasteriza las marcas del pincel directamente sobre los píxeles de la
// imagen (usado para el ZIP de imágenes, donde no hay un formato vectorial
// como en el PDF que pueda dibujar las marcas encima al vuelo).
export async function applyRedactions(
  bytes: Buffer,
  strokes: RedactionStroke[],
  mime: string
): Promise<Buffer> {
  const image = await Jimp.read(bytes);
  const w = image.width;
  const h = image.height;

  for (const stroke of strokes) {
    const [p1, p2] = stroke.points;
    if (!p1 || !p2) continue;
    const size = Math.max(2, stroke.size * w);
    stampLine(image, p1.x * w, p1.y * h, p2.x * w, p2.y * h, size);
  }

  const outMime = mime === JimpMime.png ? JimpMime.png : JimpMime.jpeg;
  return image.getBuffer(outMime);
}
