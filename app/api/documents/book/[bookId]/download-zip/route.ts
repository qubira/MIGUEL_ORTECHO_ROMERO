import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import JSZip from "jszip";
import { authOptions } from "@/lib/auth";
import { getInlineViewUrl, getEffectiveFormat } from "@/lib/cloudinaryView";
import { isValidRedactions } from "@/lib/redaction";
import { applyRedactions } from "@/lib/redactionRaster";
import { loadAuthorizedBook, isSecureUnlocked } from "@/lib/bookAccess";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";

// Un libro de decenas de hojas puede tardar en descargarse/componerse;
// evita que la función se corte antes de tiempo en hosts como Vercel.
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await loadAuthorizedBook(bookId, session);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { book, isAdmin } = result;
  const secureUnlocked = isSecureUnlocked(req, session, isAdmin);

  const zip = new JSZip();

  for (const doc of book.documents) {
    const res = await fetch(getInlineViewUrl(doc));
    if (!res.ok) continue;
    const bytes = Buffer.from(await res.arrayBuffer());

    const format = getEffectiveFormat(doc);
    const filename = `pagina-${String(doc.pageNumber).padStart(2, "0")}.${format}`;

    const shouldRedact =
      !secureUnlocked && isValidRedactions(doc.redactions) && doc.redactions.length > 0;

    if (shouldRedact) {
      try {
        const mime = format === "png" ? "image/png" : "image/jpeg";
        const redacted = await applyRedactions(bytes, doc.redactions as any, mime);
        zip.file(filename, redacted);
        continue;
      } catch {
        // si falla el rasterizado, no se incluye la hoja protegida sin cubrir
        continue;
      }
    }

    zip.file(filename, bytes);
  }

  const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `${book.title.replace(/[^\w\- ]+/g, "").trim() || "documento"}.zip`;

  await logAudit({
    action: "DOWNLOAD",
    actorId: session.user.id,
    targetUserId: book.clientId,
    detail: `Descargó ZIP de imágenes: "${book.title}" (${book.documents.length} hojas)`,
    ip: getClientIp(req.headers),
    userAgent: getUserAgent(req.headers),
  });

  return new NextResponse(Buffer.from(zipBytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
