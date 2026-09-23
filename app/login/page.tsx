import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-navy-900/85" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white">
            Miguel Ortecho Romero
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Portal privado de documentos
          </p>
        </div>
        <div className="card">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Acceso exclusivo mediante credenciales entregadas por el despacho.
        </p>
      </div>
    </main>
  );
}
