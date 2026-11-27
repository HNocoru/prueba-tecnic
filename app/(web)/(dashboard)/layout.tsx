import { Suspense } from "react";
import type { ReactNode } from "react";
import { requireUser } from "@/modules/auth";
import { Sidebar } from "@/components/organisms/Sidebar";
import { LoadingState } from "@/components/molecules/LoadingState";

/**
 * Defensa de sesión en el servidor (además del proxy). Reutiliza la identidad ya
 * verificada en esta petición, así que no hay otra llamada de red a Auth. Sigue
 * dentro de Suspense porque headers() es dato de petición con cacheComponents.
 */
async function AuthGate({ children }: { children: ReactNode }) {
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
