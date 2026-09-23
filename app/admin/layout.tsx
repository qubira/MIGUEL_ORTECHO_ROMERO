import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import ProfileToggle from "@/components/ProfileToggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-navy-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Panel de administrador</p>
            <h1 className="text-lg font-semibold">{session.user.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ProfileToggle username={session.user.username} />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
