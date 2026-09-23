import { NextRequest } from "next/server";
import { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { SECURE_MODE_COOKIE, verifySecureModeToken } from "@/lib/secureMode";

export async function loadAuthorizedBook(bookId: string, session: Session) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { documents: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book) return { error: "Libro no encontrado" as const, status: 404 as const };

  const isOwner = book.clientId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { error: "No autorizado" as const, status: 403 as const };
  }

  return { book, isAdmin };
}

export function isSecureUnlocked(req: NextRequest, session: Session, isAdmin: boolean) {
  if (isAdmin) return true;
  const token = req.cookies.get(SECURE_MODE_COOKIE)?.value;
  return verifySecureModeToken(token, session.user.id);
}
