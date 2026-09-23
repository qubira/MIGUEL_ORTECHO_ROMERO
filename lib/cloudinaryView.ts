import cloudinary from "@/lib/cloudinary";

type ViewableDocument = {
  publicId: string;
  format: string | null;
  resourceType: string;
};

// Genera una URL firmada para mostrar el documento embebido (no fuerza descarga).
// Los PDF se entregan rasterizados como imagen de su primera página, ya que
// cada Document representa una sola hoja del "libro".
export function getInlineViewUrl(doc: ViewableDocument) {
  const isPdf = doc.format?.toLowerCase() === "pdf";

  return cloudinary.url(doc.publicId, {
    resource_type: doc.resourceType,
    type: "private",
    sign_url: true,
    secure: true,
    format: isPdf ? "jpg" : doc.format || undefined,
    page: isPdf ? 1 : undefined,
  });
}
