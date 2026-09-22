import { prisma } from "@/lib/prisma";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, username: true, createdAt: true },
  });

  return (
    <AdminPanel
      initialClients={clients.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
