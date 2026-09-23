import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, rgb, LineCapStyle } from "pdf-lib";
import { authOptions } from "@/lib/auth";
import { getInlineViewUrl, getEffectiveFormat } from "@/lib/cloudinaryView";
import { isValidRedactions } from "@/lib/redaction";
import { loadAuthorizedBook, isSecureUnlocked } from "@/lib/bookAccess";

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

  const pdfDoc = await PDFDocument.create();

  for (const doc of book.documents) {
    const res = await fetch(getInlineViewUrl(doc));
    if (!res.ok) continue;
    const bytes = new Uint8Array(await res.arrayBuffer());

    let image;
    try {
      image =
        getEffectiveFormat(doc) === "png"
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
    } catch {
      continue;
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

    const shouldRedact =
      !secureUnlocked && isValidRedactions(doc.redactions) && doc.redactions.length > 0;
    if (shouldRedact) {
      for (const stroke of doc.redactions as any[]) {
        const [p1, p2] = stroke.points;
        if (!p1 || !p2) continue;
        page.drawLine({
          start: { x: p1.x * image.width, y: image.height - p1.y * image.height },
          end: { x: p2.x * image.width, y: image.height - p2.y * image.height },
          thickness: Math.max(2, stroke.size * image.width),
          color: rgb(0, 0, 0),
          lineCap: LineCapStyle.Round,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${book.title.replace(/[^\w\- ]+/g, "").trim() || "documento"}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
