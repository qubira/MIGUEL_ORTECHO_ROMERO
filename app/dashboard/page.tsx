import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const documents = await prisma.document.findMany({
    where: { clientId: session!.user.id },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-navy-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Bienvenido/a</p>
            <h1 className="text-lg font-semibold">{session?.user.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Mis documentos
        </h2>

        {documents.length === 0 ? (
          <div className="card text-center text-gray-500">
            Todavía no tienes documentos disponibles. Cuando el despacho suba
            un documento a tu nombre, aparecerá aquí.
          </div>
        ) : (
          <div className="card divide-y divide-gray-200">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-gray-800">{doc.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleDateString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {doc.bytes ? ` · ${formatBytes(doc.bytes)}` : ""}
                  </p>
                </div>
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="btn-primary"
                >
                  Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
