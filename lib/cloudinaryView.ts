import cloudinary from "@/lib/cloudinary";

type ViewableDocument = {
  publicId: string;
  format: string | null;
  resourceType: string;
};

// Genera una URL firmada para mostrar el documento embebido (no fuerza descarga).
// Los PDF se entregan rasterizados como imagen de su primera página, ya que
// cada Document representa una sola hoja del "libro".
// pdf-lib (PDF combinado) y el nombrado del ZIP solo saben tratar jpg/png,
// así que cualquier otro formato subido (webp, gif, heic, el propio pdf...)
// se fuerza a jpg aquí mismo. Antes solo se convertían los "pdf" y el resto
// se entregaba tal cual, por lo que un .webp llegaba a embedJpg() y fallaba
// en silencio, desapareciendo esa hoja del PDF/ZIP exportado.
export function getEffectiveFormat(doc: ViewableDocument): "png" | "jpg" {
  const format = doc.format?.toLowerCase();
  if (format === "png") return "png";
  if (format === "jpg" || format === "jpeg") return "jpg";
  return "jpg";
}

export function getInlineViewUrl(doc: ViewableDocument) {
  const isPdf = doc.format?.toLowerCase() === "pdf";
  const effectiveFormat = getEffectiveFormat(doc);

  return cloudinary.url(doc.publicId, {
    resource_type: doc.resourceType,
    type: "private",
    sign_url: true,
    secure: true,
    format: effectiveFormat,
    page: isPdf ? 1 : undefined,
    // Corrige físicamente los píxeles según la orientación EXIF del celular
    // que escaneó la hoja. El navegador ya la respeta al mostrar <img>, pero
    // pdf-lib (usado para el PDF combinado) la ignora y entrega la imagen
    // "cruda" tal como quedó grabada, por eso salía al revés solo ahí.
    angle: "exif",
  });
}
