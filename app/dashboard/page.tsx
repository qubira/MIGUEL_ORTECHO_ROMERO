import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import ProfileToggle from "@/components/ProfileToggle";
import DashboardDocuments from "./DashboardDocuments";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const documents = await prisma.document.findMany({
    where: { clientId: session!.user.id },
    orderBy: [{ uploadedAt: "desc" }, { pageNumber: "asc" }],
    include: { book: { select: { id: true, title: true } } },
  });

  const serialized = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    uploadedAt: doc.uploadedAt.toISOString(),
    bytes: doc.bytes,
    pageNumber: doc.pageNumber,
    book: doc.book,
  }));

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-navy-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Bienvenido/a</p>
            <h1 className="text-lg font-semibold">{session?.user.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ProfileToggle username={session!.user.username} />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Mis documentos
        </h2>

        <DashboardDocuments documents={serialized} />
      </div>
    </main>
  );
}
