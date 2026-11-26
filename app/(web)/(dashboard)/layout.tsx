import { Suspense } from "react";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { requireUser } from "@/modules/auth";
import { Sidebar } from "@/components/organisms/Sidebar";
import { LoadingState } from "@/components/molecules/LoadingState";

/**
 * Defensa de sesión en el servidor (además del proxy). Lee cookies, así que con
 * cacheComponents debe ir dentro de Suspense; el shell (sidebar) se prerenderiza.
 * connection() fuerza la lectura de la sesión en tiempo de petición: el cliente
 * de Supabase consulta Date.now() al inicializar y no puede prerenderizarse.
 */
async function AuthGate({ children }: { children: ReactNode }) {
  await connection();
  await requireUser();

  return children;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex min-h-screen flex-1 flex-col p-4 md:p-8">
        <Suspense fallback={<LoadingState />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </main>
    </div>
  );
}
