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

/**
 * Shell de altura de ventana: la página nunca hace scroll propio; solo el
 * contenido de `main` y los paneles internos pueden desplazarse.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas md:flex-row">
      <Sidebar />
      <main className="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 md:order-2 md:p-6">
        <Suspense fallback={<LoadingState />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </main>
    </div>
  );
}
