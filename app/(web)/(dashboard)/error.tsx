"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Límite de error del dashboard. Una sesión puede seguir siendo válida (JWT) mientras el usuario o su
 * negocio ya no existen (p. ej. tras reiniciar la base): en vez de mostrar un error crudo, se ofrece
 * reintentar o cerrar la sesión y volver a entrar. El mensaje real nunca se muestra (en producción
 * Next lo oculta y solo deja un digest).
 */
export default function DashboardError() {
  return (
    <Card
      role="alert"
      className="mx-auto mt-10 flex w-full max-w-md flex-col gap-4 rounded-2xl border-border p-6 text-center shadow-none"
    >
      <h1 className="text-xl font-semibold text-foreground">No pudimos cargar esta pantalla</h1>
      <p className="text-sm text-muted-foreground">
        Puede ser un fallo temporal o que tu sesión ya no sea válida. Intenta de nuevo o inicia
        sesión otra vez.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
          className="rounded-lg px-4 font-medium text-foreground hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reintentar
        </Button>
        <form action="/api/auth/logout" method="post">
          <Button
            type="submit"
            className="w-full rounded-lg px-4 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesión de nuevo
          </Button>
        </form>
      </div>
    </Card>
  );
}
